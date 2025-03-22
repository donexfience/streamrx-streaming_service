export enum FriendStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  BLOCKED = "BLOCKED",
}

export class FriendEntity {
  id?: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  previousStatus?: FriendStatus | null;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: {
    id?: string;
    userId: string;
    friendId: string;
    status: FriendStatus;
    previousStatus?: FriendStatus | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.friendId = props.friendId;
    this.status = props.status;
    this.previousStatus = props.previousStatus;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
