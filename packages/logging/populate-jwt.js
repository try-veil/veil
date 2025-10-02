function populate(jwt, user, registration) {
  if (!registration || !registration.applicationId) {
    return;
  }

  // The Application Id for Grafana from your kickstart file
  const grafanaApplicationId = '85a03867-dccf-4882-adde-1a79aeec50df';

  if (registration.applicationId === grafanaApplicationId) {
    jwt.roles = registration.roles;
  }
}
