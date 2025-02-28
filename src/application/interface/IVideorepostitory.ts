import { VideoModel } from "../../infrastructure/models/video";

export interface IVideoRepository {
  create(videoData: Partial<VideoModel>): Promise<VideoModel>;

  update(videoId: string, updateData: Partial<VideoModel>): Promise<VideoModel>;

  delete(videoId: string): Promise<void>;

  getAll(
    skip: number,
    limit: number,
    filter: any
  ): Promise<{ videos: VideoModel[]; total: number }>;

  findById(videoId: string): Promise<VideoModel>;

  findByQuery(channelId: string, filter: any): Promise<VideoModel[]>;

  updateVideoPlaylist(videoId: string, playlistId: string): Promise<VideoModel>;

  bulkUpdateVideoPlaylists(
    videoIds: string[],
    playlistId: string
  ): Promise<VideoModel[]>;

  getVideosByChannelId(
    channelId: string,
    page: number,
    limit: number
  ): Promise<{ videos: VideoModel[]; total: number }>;
}
