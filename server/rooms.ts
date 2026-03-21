interface Room {
  id: string;
  users: [string, string];
  createdAt: number;
}

const rooms = new Map<string, Room>();
const userToRoom = new Map<string, string>();

export function createRoom(userA: string, userB: string): Room {
  const roomId = `room_${userA}_${userB}`;
  const room: Room = {
    id: roomId,
    users: [userA, userB],
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  userToRoom.set(userA, roomId);
  userToRoom.set(userB, roomId);
  return room;
}

export function getRoomByUser(userId: string): Room | undefined {
  const roomId = userToRoom.get(userId);
  if (!roomId) return undefined;
  return rooms.get(roomId);
}

export function getPartner(userId: string): string | undefined {
  const room = getRoomByUser(userId);
  if (!room) return undefined;
  return room.users.find((id) => id !== userId);
}

export function removeRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.users.forEach((userId) => userToRoom.delete(userId));
  rooms.delete(roomId);
}

export function removeUserFromRoom(userId: string): string | undefined {
  const room = getRoomByUser(userId);
  if (!room) return undefined;
  const partnerId = room.users.find((id) => id !== userId);
  removeRoom(room.id);
  return partnerId;
}
