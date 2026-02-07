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
  };
}
