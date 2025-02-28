import { PlaylistModel } from "../../infrastructure/models/playlist";

export interface IPlaylistRepository {
  create(playlistData: Partial<PlaylistModel>): Promise<PlaylistModel>;
  findByIds(ids: string | string[]): Promise<PlaylistModel[]>;
  update(
    playlistId: string,
    updateData: Partial<PlaylistModel>
  ): Promise<PlaylistModel>;
  delete(playlistId: string): Promise<void>;
  getFullPlaylistById(playlistId: string): Promise<PlaylistModel>;
  findByChannelId(channelId: string): Promise<PlaylistModel[]>;
  createInitial(playlistData: Partial<PlaylistModel>): Promise<PlaylistModel>;
  updatePlaylistsVideos(
    playlistId: string,
    videos: Array<{ videoId: string; next: string | null; prev: string | null }>
  ): Promise<PlaylistModel>;
  addVideoToPlaylist(
    playlistId: string,
    videoData: { videoId: string; next: string | null; prev: string | null }
  ): Promise<PlaylistModel>;
  getAll(
    skip: number,
    limit: number,
    filters: any
  ): Promise<{ playlists: PlaylistModel[]; total: number }>;
  findById(playlistId: string): Promise<PlaylistModel>;
  findByQuery(filter: any, channelId: string): Promise<PlaylistModel[]>;
}
