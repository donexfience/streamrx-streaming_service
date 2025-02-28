export class StreamEntity {
  id: string;
  title: string;
  description?: string;
  broadcastType: string;
  category: string;
  visibility: string;
  thumbnail?: string;
  fallbackVideo?: { [key: string]: { url: string; s3Key: string } };
  schedule: { dateTime: Date };
  playlistId?: string;
  liveChat: {
    enabled: boolean;
    replay: boolean;
    participantMode: string;
    reactions: boolean;
    slowMode: boolean;
    slowModeDelay: string;
  };
  channelId: string;
  channel: any;
  status: "pending" | "scheduled" | "started" | "stopped";
  createdAt: Date;
  updatedAt: Date;

  constructor(stream: Partial<StreamEntity>) {
    Object.assign(this, stream);
  }

  isScheduled(): boolean {
    return this.status === "scheduled";
  }
}
