export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AdRow = { budget: number | null; createdAt: string; description: string | null; id: string; imageUrl: string | null; status: string; targetUrl: string | null; title: string; updatedAt: string; userId: string };
type AdInsert = { budget?: number | null; createdAt?: string; description?: string | null; id: string; imageUrl?: string | null; status?: string; targetUrl?: string | null; title: string; updatedAt: string; userId: string };
type AdUpdate = Partial<AdInsert>;

type BlockRow = { blockedId: string; blockerId: string; createdAt: string; id: string };
type BlockInsert = { blockedId: string; blockerId: string; createdAt?: string; id: string };
type BlockUpdate = Partial<BlockInsert>;

type BookmarkRow = { createdAt: string; id: string; postId: string; userId: string };
type BookmarkInsert = { createdAt?: string; id: string; postId: string; userId: string };
type BookmarkUpdate = Partial<BookmarkInsert>;

type CommentRow = { content: string; createdAt: string; id: string; postId: string; updatedAt: string; userId: string };
type CommentInsert = { content: string; createdAt?: string; id: string; postId: string; updatedAt: string; userId: string };
type CommentUpdate = Partial<CommentInsert>;

type CommunityRow = { avatarUrl: string | null; category: string | null; coverUrl: string | null; createdAt: string; description: string | null; id: string; isPrivate: boolean; name: string; slug: string };
type CommunityInsert = { avatarUrl?: string | null; category?: string | null; coverUrl?: string | null; createdAt?: string; description?: string | null; id: string; isPrivate?: boolean; name: string; slug: string };
type CommunityUpdate = Partial<CommunityInsert>;

type CommunityMemberRow = { communityId: string; createdAt: string; id: string; role: string; userId: string };
type CommunityMemberInsert = { communityId: string; createdAt?: string; id: string; role?: string; userId: string };
type CommunityMemberUpdate = Partial<CommunityMemberInsert>;

type ConversationRow = { createdAt: string; id: string; updatedAt: string };
type ConversationInsert = { createdAt?: string; id: string; updatedAt?: string };
type ConversationUpdate = Partial<ConversationInsert>;

type ConversationMemberRow = { conversationId: string; createdAt: string; id: string; userId: string };
type ConversationMemberInsert = { conversationId: string; createdAt?: string; id: string; userId: string };
type ConversationMemberUpdate = Partial<ConversationMemberInsert>;

type FollowRow = { createdAt: string; followerId: string; followingId: string; id: string; status: string };
type FollowInsert = { createdAt?: string; followerId: string; followingId: string; id: string; status?: string };
type FollowUpdate = Partial<FollowInsert>;

type LikeRow = { createdAt: string; id: string; postId: string; userId: string };
type LikeInsert = { createdAt?: string; id: string; postId: string; userId: string };
type LikeUpdate = Partial<LikeInsert>;

type MediaRow = { createdAt: string; height: number | null; id: string; mimeType: string | null; position: number; postId: string; sizeBytes: number | null; thumbnailUrl: string | null; type: string; url: string; width: number | null };
type MediaInsert = { createdAt?: string; height?: number | null; id: string; mimeType?: string | null; position?: number; postId: string; sizeBytes?: number | null; thumbnailUrl?: string | null; type: string; url: string; width?: number | null };
type MediaUpdate = Partial<MediaInsert>;

type MessageRow = { content: string; conversationId: string; createdAt: string; id: string; isRead: boolean; senderId: string };
type MessageInsert = { content: string; conversationId: string; createdAt?: string; id: string; isRead?: boolean; senderId: string };
type MessageUpdate = Partial<MessageInsert>;

type MomentRow = { createdAt: string; expiresAt: string; id: string; mediaUrl: string; text: string | null; type: string; userId: string };
type MomentInsert = { createdAt?: string; expiresAt: string; id: string; mediaUrl: string; text?: string | null; type?: string; userId: string };
type MomentUpdate = Partial<MomentInsert>;

type NotificationRow = { actorId: string | null; commentId: string | null; createdAt: string; href: string | null; id: string; isRead: boolean; message: string; postId: string | null; title: string; type: string; userId: string };
type NotificationInsert = { actorId?: string | null; commentId?: string | null; createdAt?: string; href?: string | null; id: string; isRead?: boolean; message: string; postId?: string | null; title: string; type: string; userId: string };
type NotificationUpdate = Partial<NotificationInsert>;

type PaymentRow = { amount: number; createdAt: string; externalId: string | null; id: string; status: string; type: string; updatedAt: string; userId: string };
type PaymentInsert = { amount: number; createdAt?: string; externalId?: string | null; id: string; status?: string; type: string; updatedAt: string; userId: string };
type PaymentUpdate = Partial<PaymentInsert>;

type PostRow = { authorId: string; commentsEnabled: boolean; content: string; createdAt: string; editedAt: string | null; id: string; isArchived: boolean; isPinned: boolean; kind: string; linkUrl: string | null; location: string | null; moderationStatus: string; sharedPostId: string | null; updatedAt: string; viewCount: number; visibility: string };
type PostInsert = { authorId: string; commentsEnabled?: boolean; content: string; createdAt?: string; editedAt?: string | null; id: string; isArchived?: boolean; isPinned?: boolean; kind?: string; linkUrl?: string | null; location?: string | null; moderationStatus?: string; sharedPostId?: string | null; updatedAt: string; viewCount?: number; visibility?: string };
type PostUpdate = Partial<PostInsert>;

type PostViewRow = { createdAt: string; id: string; postId: string; userId: string };
type PostViewInsert = { createdAt?: string; id: string; postId: string; userId: string };
type PostViewUpdate = Partial<PostViewInsert>;

type ProfileRow = { birthDate: string | null; createdAt: string; id: string; interests: string | null; links: string | null; location: string | null; occupation: string | null; showAge: boolean; showLocation: boolean; showSign: boolean; updatedAt: string; userId: string; website: string | null; zodiacSign: string | null };
type ProfileInsert = { birthDate?: string | null; createdAt?: string; id: string; interests?: string | null; links?: string | null; location?: string | null; occupation?: string | null; showAge?: boolean; showLocation?: boolean; showSign?: boolean; updatedAt?: string; userId: string; website?: string | null; zodiacSign?: string | null };
type ProfileUpdate = Partial<ProfileInsert>;

type ReportRow = { createdAt: string; details: string | null; id: string; reason: string; reporterId: string; resolvedAt: string | null; resolvedById: string | null; status: string; targetId: string; targetType: string };
type ReportInsert = { createdAt?: string; details?: string | null; id: string; reason: string; reporterId: string; resolvedAt?: string | null; resolvedById?: string | null; status?: string; targetId: string; targetType: string };
type ReportUpdate = Partial<ReportInsert>;

type ShareRow = { createdAt: string; id: string; postId: string; userId: string };
type ShareInsert = { createdAt?: string; id: string; postId: string; userId: string };
type ShareUpdate = Partial<ShareInsert>;

type TrackRow = { artist: string; audioUrl: string; coverUrl: string | null; createdAt: string; duration: number | null; id: string; title: string; userId: string };
type TrackInsert = { artist: string; audioUrl: string; coverUrl?: string | null; createdAt?: string; duration?: number | null; id: string; title: string; userId: string };
type TrackUpdate = Partial<TrackInsert>;

type UserRow = { accountStatus: string; avatarUrl: string | null; bio: string | null; coverUrl: string | null; createdAt: string; discoverable: boolean; email: string | null; emailVerifiedAt: string | null; googleId: string | null; id: string; isPrivate: boolean; isVerified: boolean; lastSeenAt: string | null; name: string; passwordHash: string | null; phone: string | null; phoneVerifiedAt: string | null; role: string; updatedAt: string; username: string; whoCanComment: string; whoCanMention: string; whoCanMessage: string; whoCanSeeMoments: string };
type UserInsert = { accountStatus?: string; avatarUrl?: string | null; bio?: string | null; coverUrl?: string | null; createdAt?: string; discoverable?: boolean; email?: string | null; emailVerifiedAt?: string | null; googleId?: string | null; id: string; isPrivate?: boolean; isVerified?: boolean; lastSeenAt?: string | null; name: string; passwordHash?: string | null; phone?: string | null; phoneVerifiedAt?: string | null; role?: string; updatedAt?: string; username: string; whoCanComment?: string; whoCanMention?: string; whoCanMessage?: string; whoCanSeeMoments?: string };
type UserUpdate = Partial<UserInsert>;

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      Ad: { Row: AdRow; Insert: AdInsert; Update: AdUpdate; Relationships: [
        { foreignKeyName: "Ad_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Block: { Row: BlockRow; Insert: BlockInsert; Update: BlockUpdate; Relationships: [
        { foreignKeyName: "Block_blockedId_fkey"; columns: ["blockedId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Block_blockerId_fkey"; columns: ["blockerId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Bookmark: { Row: BookmarkRow; Insert: BookmarkInsert; Update: BookmarkUpdate; Relationships: [
        { foreignKeyName: "Bookmark_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Bookmark_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      Comment: { Row: CommentRow; Insert: CommentInsert; Update: CommentUpdate; Relationships: [
        { foreignKeyName: "Comment_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Comment_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      Community: { Row: CommunityRow; Insert: CommunityInsert; Update: CommunityUpdate; Relationships: [] };
      CommunityMember: { Row: CommunityMemberRow; Insert: CommunityMemberInsert; Update: CommunityMemberUpdate; Relationships: [
        { foreignKeyName: "CommunityMember_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "CommunityMember_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      Conversation: { Row: ConversationRow; Insert: ConversationInsert; Update: ConversationUpdate; Relationships: [] };
      ConversationMember: { Row: ConversationMemberRow; Insert: ConversationMemberInsert; Update: ConversationMemberUpdate; Relationships: [
        { foreignKeyName: "ConversationMember_conversationId_fkey"; columns: ["conversationId"]; isOneToOne: false; referencedRelation: "Conversation"; referencedColumns: ["id"] },
        { foreignKeyName: "ConversationMember_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Follow: { Row: FollowRow; Insert: FollowInsert; Update: FollowUpdate; Relationships: [
        { foreignKeyName: "Follow_followerId_fkey"; columns: ["followerId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Follow_followingId_fkey"; columns: ["followingId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Like: { Row: LikeRow; Insert: LikeInsert; Update: LikeUpdate; Relationships: [
        { foreignKeyName: "Like_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Like_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      Media: { Row: MediaRow; Insert: MediaInsert; Update: MediaUpdate; Relationships: [
        { foreignKeyName: "Media_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      Message: { Row: MessageRow; Insert: MessageInsert; Update: MessageUpdate; Relationships: [
        { foreignKeyName: "Message_conversationId_fkey"; columns: ["conversationId"]; isOneToOne: false; referencedRelation: "Conversation"; referencedColumns: ["id"] },
        { foreignKeyName: "Message_senderId_fkey"; columns: ["senderId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Moment: { Row: MomentRow; Insert: MomentInsert; Update: MomentUpdate; Relationships: [
        { foreignKeyName: "Moment_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Notification: { Row: NotificationRow; Insert: NotificationInsert; Update: NotificationUpdate; Relationships: [
        { foreignKeyName: "Notification_actorId_fkey"; columns: ["actorId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Notification_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Payment: { Row: PaymentRow; Insert: PaymentInsert; Update: PaymentUpdate; Relationships: [
        { foreignKeyName: "Payment_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Post: { Row: PostRow; Insert: PostInsert; Update: PostUpdate; Relationships: [
        { foreignKeyName: "Post_authorId_fkey"; columns: ["authorId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Post_sharedPostId_fkey"; columns: ["sharedPostId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      PostView: { Row: PostViewRow; Insert: PostViewInsert; Update: PostViewUpdate; Relationships: [
        { foreignKeyName: "PostView_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] },
        { foreignKeyName: "PostView_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Profile: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [
        { foreignKeyName: "Profile_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Report: { Row: ReportRow; Insert: ReportInsert; Update: ReportUpdate; Relationships: [
        { foreignKeyName: "Report_reporterId_fkey"; columns: ["reporterId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Share: { Row: ShareRow; Insert: ShareInsert; Update: ShareUpdate; Relationships: [
        { foreignKeyName: "Share_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Share_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      Track: { Row: TrackRow; Insert: TrackInsert; Update: TrackUpdate; Relationships: [
        { foreignKeyName: "Track_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      User: { Row: UserRow; Insert: UserInsert; Update: UserUpdate; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      compute_zodiac: { Args: { birth: string }; Returns: string };
      username_available: { Args: { check_username: string }; Returns: boolean };
      get_or_create_dm: { Args: { other_user_id: string }; Returns: string };
      discoverable_profiles: {
        Args: { limit_count?: number; search_query?: string | null };
        Returns: { id: string; name: string; username: string; avatarUrl: string | null; bio: string | null; isVerified: boolean }[];
      };
      public_posts: {
        Args: { limit_count?: number; search_query?: string | null };
        Returns: {
          id: string;
          content: string;
          createdAt: string;
          kind: string;
          authorId: string;
          authorName: string;
          authorUsername: string;
          authorAvatarUrl: string | null;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
