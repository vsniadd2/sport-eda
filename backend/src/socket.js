let ioInstance = null;

export function getIO() {
  return {
    setInstance(io) {
      ioInstance = io;
    },
    getInstance() {
      return ioInstance;
    },
    emitToAdmin(event, data) {
      if (ioInstance) {
        ioInstance.to('admin').emit(event, data);
      }
    },
    emitToUser(userId, event, data) {
      if (ioInstance && userId != null) {
        ioInstance.to(`user:${userId}`).emit(event, data || {});
      }
    },
    emitToAll(event, data) {
      if (ioInstance) {
        ioInstance.emit(event, data || {});
      }
    },
  };
}
