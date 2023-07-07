export function startLocationTracking(onLocationChange, onError) {
  if (navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        onLocationChange({ latitude, longitude });
      },
      (error) => {
        onError(error);
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  } else {
    console.error("Geolocation is not supported by this browser.");
    onError(new Error("Geolocation is not supported"));
    return () => {};
  }
}
