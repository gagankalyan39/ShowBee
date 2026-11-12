// Booking microservice socket stub
// In production, this would connect to a message broker
// For demo, we export a no-op getIO

let _io: any = null;

export function initSocket(server: any) {
  // No-op for microservice — notifications sent via notification API call
  return _io;
}

export function getIO() {
  return _io;
}
