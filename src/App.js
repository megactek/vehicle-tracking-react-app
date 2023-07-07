import { useEffect, useState, useRef } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import { LocalShipping, Search } from "@material-ui/icons";
import "./style.css";
import axios from "axios";
import { format } from "timeago.js";
import Register from "./components/register/Register";
import Login from "./components/login/Login";
import { io } from "socket.io-client";
import { startLocationTracking } from "./LiveTracking";
import { getRandomID } from "./functions";

function App() {
  const myStorage = window.localStorage;
  const [currentUser, setCurrentUser] = useState(JSON.parse(myStorage.getItem("user")));
  const [viewState, setViewState] = useState({ zoom: 3.5 });
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const [trucks, setTrucks] = useState([]);
  const socket = useRef();
  const [currentPlaceId, setCurrentPlaceId] = useState(null);
  const [newPlace, setNewPlace] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [desc, setDesc] = useState("");
  const [driver, setDriver] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [newLocation, setNewLocation] = useState(null);
  const [findTruck, setFindTruck] = useState("");

  function checkDriverTrip() {
    return trucks?.find((truck) => truck.userId === currentUser?._id);
  }

  useEffect(() => {
    socket.current = io("ws://vehicle-tracking-node-server.vercel.app");

    socket.current?.on("newCoord", ({ truckId, lat, long }) => {
      const getTruck = trucks?.find((truck) => truck._id === truckId);
      getTruck && setNewLocation({ ...getTruck, long: long, lat: lat });
    });

    const source = axios.CancelToken.source();

    async function getTrucks() {
      try {
        const res = await axios.get(process.env.REACT_APP_PROXY + "/trucks");
        setTrucks(res.data);
      } catch (err) {
        console.log(err);
      }
    }

    socket.current?.on("refreshCoord", () => {
      getTrucks();
    });

    getTrucks();

    return () => {
      source.cancel();
    };
  }, []);

  useEffect(() => {
    if (newLocation) {
      const oldTrucks = trucks.filter((truck) => truck._id !== newLocation._id);
      setTrucks([...oldTrucks, newLocation]);
    }
    return () => {
      setNewLocation(null);
    };
  }, [newLocation]);

  function handleFindTruck() {
    const truckToFind = trucks?.find((truck) => truck._id === findTruck);
    if (truckToFind) {
      setViewState({ long: truckToFind.long, lat: truckToFind.lat });
      return;
    }
    alert("Truck not found");
  }

  useEffect(() => {
    const cleanup = startLocationTracking(
      ({ latitude, longitude }) => {
        setLocation({ ...location, latitude: latitude, longitude: longitude });
      },
      (error) => {
        console.error("Error getting location:", error);
      }
    );
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const source = axios.CancelToken.source();
    async function updateLocation(truck, data) {
      try {
        const res = await axios.put(process.env.REACT_APP_PROXY + "/trucks/" + truck._id, {
          lat: data.latitude,
          long: data.longitude,
        });
        setTrucks([...trucks, res.data]);
      } catch (err) {
        console.log(err);
      }
    }
    if (checkDriverTrip() && location) {
      const { longitude, latitude } = location;
      const truck = trucks.find((truck) => truck.userId === currentUser?._id);
      const newData = { latitude, longitude };
      if (truck.lat !== latitude || truck.long !== longitude) {
        updateLocation(truck, newData);
      }
      socket.current?.emit("updateCoord", { truckId: truck._id, lat: newData.latitude, long: newData.longitude });
    }
    return () => {
      source.cancel();
    };
  }, [currentUser, location]);

  const handleMarkerClick = (id, lat, long) => {
    setCurrentPlaceId(id);
    setViewState({ ...viewState, latitude: lat, longitude: long });
  };

  useEffect(() => {
    const source = axios.CancelToken.source();
    async function getDrivers() {
      try {
        const res = await axios.get(process.env.REACT_APP_PROXY + "/users/drivers");
        setDrivers(res.data);
      } catch (err) {
        console.log(err);
      }
    }
    getDrivers();
    return () => {
      source.cancel();
    };
  }, [newPlace]);

  const handleAddClick = (e) => {
    if (currentUser?.accountType === "manager") {
      const { lng, lat } = e.lngLat;
      setNewPlace({ lat, long: lng });
    }
  };

  const handleSubmit = async (e) => {
    setLoading(true);
    e.preventDefault();
    if (driver === "") {
      alert("select a driver");
      return;
    }
    const newVehicleId = getRandomID();
    const truckDriver = drivers.find((d) => d._id === driver);
    const newTruck = {
      userId: truckDriver._id,
      vehicleId: newVehicleId,
      desc: desc,
      long: newPlace.long,
      lat: newPlace.lat,
    };
    try {
      const res = await axios.post(process.env.REACT_APP_PROXY + "/trucks", newTruck);
      socket.current?.emit("deleteCoord");
      if (res.status === 201) {
        setTrucks([...trucks, res.data]);
        setNewPlace(null);
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    myStorage.removeItem("user");
    setCurrentUser(null);
  };

  function getDriver(driverId) {
    const driver = drivers.find((driver) => driver._id === driverId);
    return driver?.username || "No Name";
  }

  async function handleDeleteTruck(truckId) {
    setLoading(true);
    try {
      const res = await axios.delete(`${process.env.REACT_APP_PROXY}/trucks/${truckId}`);
      setTrucks(res.data);
      setViewState({ ...viewState, longitude: 6.5227044, latitude: 3.6217802 });
      socket.current?.emit("deleteCoord", () => {});
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  }

  return (
    <div className="App">
      <Map
        {...viewState}
        mapboxAccessToken={process.env.REACT_APP_MAPBOX}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100vw", height: "100vh" }}
        mapStyle="mapbox://styles/mapbox/streets-v9"
        onDblClick={handleAddClick}
        transitionDuration={200}
      >
        {trucks &&
          trucks?.map((p, i) => (
            <div key={i}>
              <Marker
                longitude={p?.long}
                latitude={p?.lat}
                offsetLeft={-viewState.zoom * 3.5}
                offsetTop={-viewState.zoom * 7}
              >
                <LocalShipping
                  style={{
                    fontSize: viewState.zoom * 7,
                    color: p?.username === currentUser ? "tomato" : "slateblue",
                    cursor: "pointer",
                  }}
                  onClick={() => handleMarkerClick(p?._id, p?.lat, p?.long)}
                />
              </Marker>
              {p?._id === currentPlaceId && (
                <Popup
                  longitude={p?.long}
                  latitude={p?.lat}
                  closeButton={true}
                  closeOnClick={false}
                  anchor="left"
                  onClose={() => setCurrentPlaceId(null)}
                >
                  <div className="card">
                    <label>Vehicle ID</label>
                    <h4 className="place">{p?.vehicleId}</h4>
                    <label>Description</label>
                    <p className="desc">{p?.desc}</p>
                    <label>Driver</label>
                    <div className="stars">{getDriver(p?.userId)}</div>
                    <div className="detailsBottom">
                      <span className="date">last seen: {format(p?.updatedAt)}</span>
                      <button
                        className="deleteButton"
                        type="button"
                        onClick={() => handleDeleteTruck(p?._id)}
                        disabled={loading}
                      >
                        {loading ? "loading..." : "delete truck"}
                      </button>
                    </div>
                  </div>
                </Popup>
              )}
            </div>
          ))}
        {newPlace && (
          <Popup
            longitude={newPlace.long}
            latitude={newPlace.lat}
            closeButton={true}
            closeOnClick={false}
            anchor="left"
            onClose={() => setNewPlace(null)}
          >
            <div>
              <form onSubmit={handleSubmit}>
                <label>Description</label>
                <textarea
                  placeholder="Tell us something about this place"
                  onChange={(e) => setDesc(e.target.value)}
                ></textarea>
                <label>Select Driver</label>
                <select onChange={(e) => setDriver(e.target.value)} placeholder="select a driver">
                  <option value="">select a driver</option>
                  {drivers?.map((driver, index) => (
                    <option key={index} value={driver._id}>
                      {driver.email}
                    </option>
                  ))}
                </select>
                <button className="submitButton" type="submit" disabled={loading}>
                  {loading ? "loading..." : "Add Truck"}
                </button>
              </form>
            </div>
          </Popup>
        )}
        {currentUser ? (
          <div className="top">
            <div className="top__right">
              <span>{currentUser?.username}</span>
              <span>({currentUser?.accountType})</span>
            </div>
            <div className="top__middle">
              <div className="search__input">
                <input
                  type="text"
                  placeholder="find truck by id"
                  onChange={(e) => setFindTruck(e.target.value)}
                  value={findTruck}
                />
                {!loading && <Search onClick={handleFindTruck} />}
              </div>
            </div>
            <div className="top__left">
              <button className="button" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="buttons">
            <button className="button login" onClick={() => setShowLogin(true)}>
              Login
            </button>
            <button className="button register" onClick={() => setShowRegister(true)}>
              Register
            </button>
          </div>
        )}
        {showRegister && <Register setShowRegister={setShowRegister} />}
        {showLogin && <Login setShowLogin={setShowLogin} myStorage={myStorage} setCurrentUser={setCurrentUser} />}
      </Map>
    </div>
  );
}

export default App;
