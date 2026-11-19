import { io } from "socket.io-client";
import { env } from "../utils/env.js";
import { getAuthToken } from "./api.js";

let socket = null;
let statusListeners = [];

export const getSocket = () => socket;

export const connectSocket = () => {
  const token = getAuthToken();
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    notifyStatus("disconnected");
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  notifyStatus("connecting");

  socket = io(env.VITE_API_URL, {
    auth: { token },
    extraHeaders: {
      Authorization: `Bearer ${token}`
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  socket.on("connect", () => {
    notifyStatus("connected");
  });

  socket.on("disconnect", (reason) => {
    notifyStatus(reason === "io client disconnect" ? "disconnected" : "reconnecting");
  });

  socket.on("connect_error", () => {
    notifyStatus("error");
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  notifyStatus("disconnected");
};

export const onSocketStatusChange = (callback) => {
  statusListeners.push(callback);
  callback(socket?.connected ? "connected" : "disconnected");
  return () => {
    statusListeners = statusListeners.filter((cb) => cb !== callback);
  };
};

export const onReplayProgress = (callback) => {
  const s = socket || connectSocket();
  if (!s) return () => {};
  s.on("replay:progress", callback);
  return () => {
    s.off("replay:progress", callback);
  };
};

export const onNotificationNew = (callback) => {
  const s = socket || connectSocket();
  if (!s) return () => {};
  s.on("notification:new", callback);
  return () => {
    s.off("notification:new", callback);
  };
};

export const onIncidentNew = (callback) => {
  const s = socket || connectSocket();
  if (!s) return () => {};
  s.on("incident:new", callback);
  return () => {
    s.off("incident:new", callback);
  };
};

const notifyStatus = (status) => {
  statusListeners.forEach((cb) => cb(status));
};
