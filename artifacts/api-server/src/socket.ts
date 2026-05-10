import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  _io = io;
}

export function getSocketIO(): SocketIOServer | null {
  return _io;
}

export function pushToBoss(event: string, data: any) {
  if (_io) {
    _io.emit(event, data);
  }
}
