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

type CommentRow = { content: string; createdAt: string; id: string; postId: string; updatedAt: string; userId: string; status: string; parentId: string | null };
type CommentInsert = { content: string; createdAt?: string; id: string; postId: string; updatedAt: string; userId: string; parentId?: string | null };
type CommentUpdate = Partial<CommentInsert>;

type CommunityRow = { avatarUrl: string | null; category: string | null; coverUrl: string | null; createdAt: string; description: string | null; id: string; isPrivate: boolean; name: string; slug: string; username: string; isOfficial: boolean; accentColor: string | null; rules: string | null; links: Json; permissions: Json; moderation: Json; notifyPrefs: Json; memberCount: number; createdById: string | null; updatedAt: string; ownerId: string | null; status: string; tags: Json; welcome: Json; rulesList: Json; hashtagSuffix: string | null; isRpg: boolean };
type CommunityRoleRow = { id: string; communityId: string; name: string; description: string | null; color: string; icon: string; rank: number; permissions: Json; sortOrder: number; createdAt: string };
type CommunityMemberRoleRow = { id: string; communityId: string; userId: string; roleId: string; assignedById: string | null; createdAt: string };
type CommunityTabRow = { id: string; communityId: string; name: string; hashtags: Json; sortOrder: number; createdAt: string };
type CommunityTabPostRow = { tabId: string; postId: string; communityId: string; auto: boolean; createdAt: string };
type CommunityInsert = { avatarUrl?: string | null; category?: string | null; coverUrl?: string | null; createdAt?: string; description?: string | null; id: string; isPrivate?: boolean; name: string; slug: string };
type CommunityUpdate = Partial<CommunityInsert>;

type CommunityMemberRow = { communityId: string; createdAt: string; id: string; role: string; userId: string; notify: boolean; overrides: Json; notifyLevel: string };
type CommunityMemberInsert = { communityId: string; createdAt?: string; id: string; role?: string; userId: string };
type CommunityMemberUpdate = Partial<CommunityMemberInsert>;

type ConversationRow = { createdAt: string; id: string; updatedAt: string; isGroup: boolean; isSaved: boolean; name: string | null; avatarUrl: string | null; description: string | null; createdById: string | null; messageTtlSeconds: number | null; lastMessageAt: string | null; communityId: string | null };
type ConversationInsert = { createdAt?: string; id: string; updatedAt?: string };
type ConversationUpdate = Partial<ConversationInsert>;

type ConversationMemberRow = { conversationId: string; createdAt: string; id: string; userId: string; role: string; lastReadAt: string | null };
type ConversationMemberInsert = { conversationId: string; createdAt?: string; id: string; userId: string };
type ConversationMemberUpdate = Partial<ConversationMemberInsert>;

type FollowRow = { createdAt: string; followerId: string; followingId: string; id: string; status: string };
type FollowInsert = { createdAt?: string; followerId: string; followingId: string; id: string; status?: string };
type FollowUpdate = Partial<FollowInsert>;

type LikeRow = { createdAt: string; id: string; postId: string; userId: string; reaction: string };
type LikeInsert = { createdAt?: string; id: string; postId: string; userId: string; reaction?: string };
type LikeUpdate = Partial<LikeInsert>;

type MediaRow = { createdAt: string; height: number | null; id: string; mimeType: string | null; position: number; postId: string; sizeBytes: number | null; thumbnailUrl: string | null; type: string; url: string; width: number | null; name: string | null };
type MediaInsert = { createdAt?: string; height?: number | null; id: string; mimeType?: string | null; position?: number; postId: string; sizeBytes?: number | null; thumbnailUrl?: string | null; type: string; url: string; width?: number | null };
type MediaUpdate = Partial<MediaInsert>;

type MessageRow = { content: string; conversationId: string; createdAt: string; id: string; isRead: boolean; senderId: string; type: string; attachments: Json; meta: Json; replyToId: string | null; deletedAt: string | null; deliveredAt: string | null; expiresAt: string | null };
type MessageInsert = { content: string; conversationId: string; createdAt?: string; id: string; isRead?: boolean; senderId: string; type?: string; attachments?: Json; meta?: Json; replyToId?: string | null };

type MessageReactionRow = { id: string; messageId: string; conversationId: string; userId: string; emoji: string; createdAt: string };
type PollVoteRow = { id: string; messageId: string; conversationId: string; userId: string; optionIndex: number; createdAt: string };
type MessageFavoriteRow = { messageId: string; userId: string; conversationId: string; createdAt: string };
type MessageHiddenRow = { messageId: string; userId: string; createdAt: string };
type ConversationSettingRow = { conversationId: string; userId: string; archivedAt: string | null; mutedUntil: string | null; theme: string | null; wallpaper: string | null; clearedAt: string | null; updatedAt: string };
type StickerPackRow = { id: string; name: string; tier: string; priceCoins: number | null; isAdult: boolean; sortOrder: number; cover: string; stickers: string[]; labels: string[] | null; active: boolean; createdAt: string; section: string; category: string | null; animated: boolean; creator: string; description: string; categories: string[]; rating: string; published: boolean; featured: boolean; isDefault: boolean; exclusive: boolean; availableFrom: string | null; availableUntil: string | null; updatedAt: string };
type StickerRow = { id: string; packId: string; slug: string; label: string; keywords: string[]; storage: string; file: string; preview: string | null; format: string; mime: string; width: number; height: number; bytes: number; size: string; hasText: boolean; rating: string; sortOrder: number; active: boolean; createdAt: string };
type StickerCategoryRow = { id: string; name: string; emoji: string; sortOrder: number; isAdult: boolean; active: boolean };
type StickerPackFavoriteRow = { userId: string; packId: string; createdAt: string };
type StickerRecentRow = { userId: string; stickerId: string; lastUsedAt: string; uses: number };
type StickerFavoriteRow = { userId: string; sticker: string; createdAt: string };
type CoinWalletRow = { userId: string; balance: number; updatedAt: string };
type CoinTransactionRow = { id: string; userId: string; amount: number; balanceAfter: number; kind: string; productId: string | null; referenceId: string | null; description: string; createdAt: string };
type StoreProductRow = { id: string; kind: string; refId: string; name: string; description: string; image: string; priceCoins: number; tier: string; isAdult: boolean; badge: string | null; sortOrder: number; active: boolean; meta: Json; createdAt: string };
type UserInventoryRow = { userId: string; productId: string; source: string; isFavorite: boolean; acquiredAt: string };
type VirtualGiftRow = { id: string; productId: string; senderId: string; recipientId: string; conversationId: string | null; messageId: string | null; priceCoins: number; note: string | null; createdAt: string };
type CommunityAlbumRow = { id: string; communityId: string; title: string; description: string; coverUrl: string | null; createdById: string | null; createdAt: string };
type PostPollVoteRow = { postId: string; userId: string; optionIndex: number; createdAt: string };
type CommunityDiscussionRow = { id: string; communityId: string; authorId: string; title: string; body: string; imageUrl: string | null; isPinned: boolean; isClosed: boolean; status: string; replyCount: number; createdAt: string; updatedAt: string; lastActivityAt: string; category: string; likeCount: number; authorType: string };
type CommunityDiscussionReplyRow = { id: string; discussionId: string; userId: string; content: string; status: string; createdAt: string };
type CommunityJoinRequestRow = { communityId: string; userId: string; message: string; status: string; createdAt: string; decidedAt: string | null; decidedById: string | null };
type UserSessionRow = { id: string; userId: string; sessionId: string; deviceId: string; deviceType: string; authSessionId: string | null; lastHeartbeatAt: string; lastActivityAt: string; visibilityState: string; isActive: boolean; createdAt: string; updatedAt: string };
type UserPresenceRow = { userId: string; status: string; lastSeenAt: string | null; updatedAt: string };
type CommunityMemberEventRow = { id: number; communityId: string; userId: string | null; kind: string; createdAt: string };
type CommunityBanRow = { communityId: string; userId: string; reason: string; bannedById: string | null; createdAt: string };
type CommunityMuteRow = { communityId: string; userId: string; until: string | null; reason: string; mutedById: string | null; createdAt: string };
type CommunityActionLogRow = { id: number; communityId: string; actorId: string | null; action: string; targetType: string | null; targetId: string | null; details: Json; createdAt: string };
type CommunityEventRow = { id: string; communityId: string; createdById: string | null; title: string; description: string; startsAt: string; endsAt: string | null; location: string; locationUrl: string | null; imageUrl: string | null; maxParticipants: number | null; status: string; goingCount: number; interestedCount: number; remindedAt: string | null; createdAt: string; updatedAt: string };
type CommunityEventRsvpRow = { eventId: string; userId: string; status: string; createdAt: string };
type CommunityFavoriteRow = { userId: string; communityId: string; createdAt: string };
type CommunityDiscussionLikeRow = { discussionId: string; userId: string; createdAt: string };
type MomentViewRow = { momentId: string; userId: string; createdAt: string };
type MomentReactionRow = { momentId: string; userId: string; emoji: string; createdAt: string };
type MomentPollVoteRow = { momentId: string; userId: string; option: number; createdAt: string };
type UserStickerPackRow = { userId: string; packId: string; acquiredAt: string; installed: boolean; source: string; updatedAt: string };
type ReadOnly<R> = { Row: R; Insert: never; Update: never; Relationships: [] };
type MessageUpdate = Partial<MessageInsert>;

type CallRow = { id: string; conversationId: string; callerId: string; calleeId: string; kind: string; status: string; createdAt: string; answeredAt: string | null; endedAt: string | null };
type MomentRow = { createdAt: string; expiresAt: string; id: string; mediaUrl: string | null; text: string | null; type: string; userId: string; communityId: string | null; asCommunity: boolean; meta: Json; thumbnailUrl: string | null; viewCount: number };
type MomentInsert = { createdAt?: string; expiresAt: string; id: string; mediaUrl?: string | null; text?: string | null; type?: string; userId: string };
type MomentUpdate = Partial<MomentInsert>;

type NotificationRow = { actorId: string | null; commentId: string | null; createdAt: string; href: string | null; id: string; isRead: boolean; message: string; postId: string | null; title: string; type: string; userId: string; dedupeKey: string | null };
type NotificationInsert = { actorId?: string | null; commentId?: string | null; createdAt?: string; href?: string | null; id: string; isRead?: boolean; message: string; postId?: string | null; title: string; type: string; userId: string };
type NotificationUpdate = Partial<NotificationInsert>;

type PaymentRow = { amount: number; createdAt: string; externalId: string | null; id: string; status: string; type: string; updatedAt: string; userId: string };
type PaymentInsert = { amount: number; createdAt?: string; externalId?: string | null; id: string; status?: string; type: string; updatedAt: string; userId: string };
type PaymentUpdate = Partial<PaymentInsert>;

type DiamondPackageRow = { id: string; diamonds: number; priceBRL: number; label: string | null; badge: string | null; sortOrder: number; active: boolean; createdAt: string; updatedAt: string };
type DiamondPackageInsert = { id?: string; diamonds: number; priceBRL: number; label?: string | null; badge?: string | null; sortOrder?: number; active?: boolean; createdAt?: string; updatedAt?: string };
type DiamondPackageUpdate = Partial<DiamondPackageInsert>;

type DiamondOrderRow = { id: string; userId: string; packageId: string | null; diamonds: number; amountBRL: number; currency: string; provider: string; providerRef: string | null; providerPaymentId: string | null; status: string; creditTxnId: string | null; rawStatus: string | null; metadata: Json; createdAt: string; updatedAt: string; paidAt: string | null };
type DiamondOrderInsert = { id?: string; userId: string; packageId?: string | null; diamonds: number; amountBRL: number; currency?: string; provider?: string; providerRef?: string | null; providerPaymentId?: string | null; status?: string; creditTxnId?: string | null; rawStatus?: string | null; metadata?: Json; createdAt?: string; updatedAt?: string; paidAt?: string | null };
type DiamondOrderUpdate = Partial<DiamondOrderInsert>;

type WebhookEventRow = { id: number; provider: string; eventType: string | null; resourceId: string | null; requestId: string | null; signatureOk: boolean; status: string; payload: Json; note: string | null; receivedAt: string; processedAt: string | null };
type WebhookEventInsert = { provider: string; eventType?: string | null; resourceId?: string | null; requestId?: string | null; signatureOk?: boolean; status?: string; payload?: Json; note?: string | null; receivedAt?: string; processedAt?: string | null };
type WebhookEventUpdate = Partial<WebhookEventInsert>;

type FamilyLinkRow = { id: string; userId: string; relativeId: string; relation: string; status: string; createdAt: string; respondedAt: string | null };
type FamilyLinkInsert = { id?: string; userId: string; relativeId: string; relation: string; status?: string; createdAt?: string; respondedAt?: string | null };
type FamilyLinkUpdate = Partial<FamilyLinkInsert>;

type TestimonialRow = { id: string; profileId: string; authorId: string; body: string; status: string; createdAt: string; approvedAt: string | null };
type TestimonialInsert = { id?: string; profileId: string; authorId: string; body: string; status?: string; createdAt?: string; approvedAt?: string | null };
type TestimonialUpdate = Partial<TestimonialInsert>;

type DiceRollRow = { id: string; conversationId: string; userId: string; dice: string; sides: number; count: number; rolls: number[]; total: number; messageId: string | null; createdAt: string };
type DiceRollInsert = { id?: string; conversationId: string; userId: string; dice: string; sides: number; count?: number; rolls: number[]; total: number; messageId?: string | null; createdAt?: string };
type DiceRollUpdate = Partial<DiceRollInsert>;

type PostRow = { authorId: string; commentsEnabled: boolean; content: string; createdAt: string; editedAt: string | null; id: string; isArchived: boolean; isPinned: boolean; kind: string; linkUrl: string | null; location: string | null; moderationStatus: string; sharedPostId: string | null; updatedAt: string; viewCount: number; visibility: string; communityId: string | null; albumId: string | null; meta: Json; authorType: string; publishAt: string | null };
type PostInsert = { authorId: string; commentsEnabled?: boolean; content: string; createdAt?: string; editedAt?: string | null; id: string; isArchived?: boolean; isPinned?: boolean; kind?: string; linkUrl?: string | null; location?: string | null; moderationStatus?: string; sharedPostId?: string | null; updatedAt: string; viewCount?: number; visibility?: string; publishAt?: string | null };
type PostUpdate = Partial<PostInsert>;

type PostViewRow = { createdAt: string; id: string; postId: string; userId: string };
type PostViewInsert = { createdAt?: string; id: string; postId: string; userId: string };
type PostViewUpdate = Partial<PostViewInsert>;

type ProfileRow = { birthDate: string | null; createdAt: string; gender: string | null; id: string; interests: string | null; links: string | null; location: string | null; occupation: string | null; showAge: boolean; relationshipStatus: string | null; relationship: string | null; about: Json; showInterests: boolean; showRelationship: boolean; showLocation: boolean; showSign: boolean; updatedAt: string; userId: string; website: string | null; zodiacSign: string | null; familyVisibility: string };
type ProfileInsert = { birthDate?: string | null; createdAt?: string; gender?: string | null; id: string; interests?: string | null; links?: string | null; location?: string | null; occupation?: string | null; showAge?: boolean; relationshipStatus?: string | null; relationship?: string | null; showInterests?: boolean; showRelationship?: boolean; showLocation?: boolean; showSign?: boolean; updatedAt?: string; userId: string; website?: string | null; zodiacSign?: string | null; familyVisibility?: string };
type ProfileUpdate = Partial<ProfileInsert>;

type ReportRow = { createdAt: string; details: string | null; id: string; reason: string; reporterId: string; resolvedAt: string | null; resolvedById: string | null; status: string; targetId: string; targetType: string; communityId: string | null };
type ReportInsert = { createdAt?: string; details?: string | null; id: string; reason: string; reporterId: string; resolvedAt?: string | null; resolvedById?: string | null; status?: string; targetId: string; targetType: string };
type ReportUpdate = Partial<ReportInsert>;

type ShareRow = { createdAt: string; id: string; postId: string; userId: string };
type ShareInsert = { createdAt?: string; id: string; postId: string; userId: string };
type ShareUpdate = Partial<ShareInsert>;

type TrackRow = { artist: string; audioUrl: string; coverUrl: string | null; createdAt: string; duration: number | null; id: string; title: string; userId: string | null; isOfficial: boolean; isHidden: boolean; genre: string | null; album: string | null; license: string | null; licenseUrl: string | null; sourceUrl: string | null; sourceId: string | null; updatedAt: string; youtubeId: string | null };
type TrackInsert = { artist: string; audioUrl: string; coverUrl?: string | null; createdAt?: string; duration?: number | null; id: string; title: string; userId: string; album?: string | null; genre?: string | null; youtubeId?: string | null };
type PlaylistRow = { id: string; userId: string; title: string; description: string | null; coverUrl: string | null; isPublic: boolean; createdAt: string; updatedAt: string };
type PlaylistInsert = { id?: string; userId: string; title: string; description?: string | null; coverUrl?: string | null; isPublic?: boolean; updatedAt?: string };
type PlaylistTrackRow = { id: string; playlistId: string; trackId: string; position: number; addedAt: string };
type PlaylistTrackInsert = { id?: string; playlistId: string; trackId: string; position?: number };
type TrackUpdate = Partial<TrackInsert>;

type UserRow = { accountStatus: string; avatarUrl: string | null; bio: string | null; coverUrl: string | null; createdAt: string; discoverable: boolean; email: string | null; emailVerifiedAt: string | null; googleId: string | null; id: string; isPrivate: boolean; isVerified: boolean; lastSeenAt: string | null; name: string; orbitId: string | null; pinnedPostId: string | null; presence: string; showPresence: boolean; profileColor: string; avatarFrame: string | null; isPremium: boolean; premiumSince: string | null; profileMusic: Json; passwordHash: string | null; phone: string | null; phoneVerifiedAt: string | null; privacyAcceptedAt: string | null; privacyAcceptedVersion: string | null; role: string; termsAcceptedAt: string | null; termsAcceptedVersion: string | null; updatedAt: string; username: string; whoCanComment: string; whoCanMention: string; whoCanMessage: string; whoCanSeeMoments: string; hiddenProfileCommunities: string[] };
type UserInsert = { accountStatus?: string; avatarUrl?: string | null; bio?: string | null; coverUrl?: string | null; createdAt?: string; discoverable?: boolean; email?: string | null; emailVerifiedAt?: string | null; googleId?: string | null; id: string; isPrivate?: boolean; isVerified?: boolean; lastSeenAt?: string | null; name: string; orbitId?: string | null; pinnedPostId?: string | null; presence?: string; profileColor?: string; avatarFrame?: string | null; passwordHash?: string | null; phone?: string | null; phoneVerifiedAt?: string | null; privacyAcceptedAt?: string | null; privacyAcceptedVersion?: string | null; role?: string; termsAcceptedAt?: string | null; termsAcceptedVersion?: string | null; updatedAt?: string; username: string; whoCanComment?: string; whoCanMention?: string; whoCanMessage?: string; whoCanSeeMoments?: string; hiddenProfileCommunities?: string[] };
type UserUpdate = Partial<UserInsert>;

type WaitlistRow = { id: string; email: string; source: string | null; createdAt: string };
type WaitlistInsert = { id: string; email: string; source?: string | null; createdAt?: string };
type WaitlistUpdate = Partial<WaitlistInsert>;

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
      CommunityRole: { Row: CommunityRoleRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityRole_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      CommunityMemberRole: { Row: CommunityMemberRoleRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityMemberRole_roleId_fkey"; columns: ["roleId"]; isOneToOne: false; referencedRelation: "CommunityRole"; referencedColumns: ["id"] },
        { foreignKeyName: "CommunityMemberRole_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      CommunityTab: { Row: CommunityTabRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityTab_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      CommunityTabPost: { Row: CommunityTabPostRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityTabPost_tabId_fkey"; columns: ["tabId"]; isOneToOne: false; referencedRelation: "CommunityTab"; referencedColumns: ["id"] },
        { foreignKeyName: "CommunityTabPost_postId_fkey"; columns: ["postId"]; isOneToOne: false; referencedRelation: "Post"; referencedColumns: ["id"] }
      ] };
      CommunityMember: { Row: CommunityMemberRow; Insert: CommunityMemberInsert; Update: CommunityMemberUpdate; Relationships: [
        { foreignKeyName: "CommunityMember_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "CommunityMember_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      Conversation: { Row: ConversationRow; Insert: ConversationInsert; Update: ConversationUpdate; Relationships: [] };
      ConversationMember: { Row: ConversationMemberRow; Insert: ConversationMemberInsert; Update: ConversationMemberUpdate; Relationships: [
        { foreignKeyName: "ConversationMember_conversationId_fkey"; columns: ["conversationId"]; isOneToOne: false; referencedRelation: "Conversation"; referencedColumns: ["id"] },
        { foreignKeyName: "ConversationMember_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Friendship: {
        Row: { id: string; requesterId: string; addresseeId: string; status: string; createdAt: string; respondedAt: string | null };
        Insert: { id?: string; requesterId: string; addresseeId: string; status?: string; createdAt?: string; respondedAt?: string | null };
        Update: { id?: string; requesterId?: string; addresseeId?: string; status?: string; createdAt?: string; respondedAt?: string | null };
        Relationships: [];
      };
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
      MessageReaction: ReadOnly<MessageReactionRow>;
      PollVote: ReadOnly<PollVoteRow>;
      MessageFavorite: ReadOnly<MessageFavoriteRow>;
      MessageHidden: ReadOnly<MessageHiddenRow>;
      ConversationSetting: ReadOnly<ConversationSettingRow>;
      StickerPack: ReadOnly<StickerPackRow>;
      UserStickerPack: ReadOnly<UserStickerPackRow>;
      StickerFavorite: ReadOnly<StickerFavoriteRow>;
      Sticker: ReadOnly<StickerRow>;
      StickerCategory: ReadOnly<StickerCategoryRow>;
      StickerPackFavorite: ReadOnly<StickerPackFavoriteRow>;
      StickerRecent: ReadOnly<StickerRecentRow>;
      CommunityAlbum: ReadOnly<CommunityAlbumRow>;
      PostPollVote: ReadOnly<PostPollVoteRow>;
      CommunityDiscussion: { Row: CommunityDiscussionRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityDiscussion_authorId_fkey"; columns: ["authorId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      CommunityDiscussionReply: { Row: CommunityDiscussionReplyRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityDiscussionReply_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "CommunityDiscussionReply_discussionId_fkey"; columns: ["discussionId"]; isOneToOne: false; referencedRelation: "CommunityDiscussion"; referencedColumns: ["id"] }
      ] };
      CommunityJoinRequest: { Row: CommunityJoinRequestRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityJoinRequest_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      CommunityBan: { Row: CommunityBanRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityBan_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      CommunityMemberEvent: { Row: CommunityMemberEventRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityMemberEvent_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      CommunityMute: ReadOnly<CommunityMuteRow>;
      CommunityActionLog: { Row: CommunityActionLogRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityActionLog_actorId_fkey"; columns: ["actorId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      CommunityEvent: { Row: CommunityEventRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityEvent_createdById_fkey"; columns: ["createdById"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      CommunityEventRsvp: { Row: CommunityEventRsvpRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "CommunityEventRsvp_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "CommunityEventRsvp_eventId_fkey"; columns: ["eventId"]; isOneToOne: false; referencedRelation: "CommunityEvent"; referencedColumns: ["id"] }
      ] };
      CommunityFavorite: { Row: CommunityFavoriteRow; Insert: { userId: string; communityId: string }; Update: never; Relationships: [
        { foreignKeyName: "CommunityFavorite_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      CommunityDiscussionLike: ReadOnly<CommunityDiscussionLikeRow>;
      MomentView: ReadOnly<MomentViewRow>;
      MomentReaction: ReadOnly<MomentReactionRow>;
      MomentPollVote: ReadOnly<MomentPollVoteRow>;
      UserSession: ReadOnly<UserSessionRow>;
      UserPresence: ReadOnly<UserPresenceRow>;
      CoinWallet: ReadOnly<CoinWalletRow>;
      CoinTransaction: ReadOnly<CoinTransactionRow>;
      StoreProduct: ReadOnly<StoreProductRow>;
      UserInventory: { Row: UserInventoryRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "UserInventory_productId_fkey"; columns: ["productId"]; isOneToOne: false; referencedRelation: "StoreProduct"; referencedColumns: ["id"] }
      ] };
      VirtualGift: { Row: VirtualGiftRow; Insert: never; Update: never; Relationships: [
        { foreignKeyName: "VirtualGift_productId_fkey"; columns: ["productId"]; isOneToOne: false; referencedRelation: "StoreProduct"; referencedColumns: ["id"] },
        { foreignKeyName: "VirtualGift_senderId_fkey"; columns: ["senderId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "VirtualGift_recipientId_fkey"; columns: ["recipientId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Call: { Row: CallRow; Insert: Partial<CallRow>; Update: Partial<CallRow>; Relationships: [
        { foreignKeyName: "Call_callerId_fkey"; columns: ["callerId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Call_calleeId_fkey"; columns: ["calleeId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Moment: { Row: MomentRow; Insert: MomentInsert; Update: MomentUpdate; Relationships: [
        { foreignKeyName: "Moment_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Moment_communityId_fkey"; columns: ["communityId"]; isOneToOne: false; referencedRelation: "Community"; referencedColumns: ["id"] }
      ] };
      Notification: { Row: NotificationRow; Insert: NotificationInsert; Update: NotificationUpdate; Relationships: [
        { foreignKeyName: "Notification_actorId_fkey"; columns: ["actorId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Notification_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Payment: { Row: PaymentRow; Insert: PaymentInsert; Update: PaymentUpdate; Relationships: [
        { foreignKeyName: "Payment_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      DiamondPackage: { Row: DiamondPackageRow; Insert: DiamondPackageInsert; Update: DiamondPackageUpdate; Relationships: [] };
      DiamondOrder: { Row: DiamondOrderRow; Insert: DiamondOrderInsert; Update: DiamondOrderUpdate; Relationships: [
        { foreignKeyName: "DiamondOrder_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "DiamondOrder_packageId_fkey"; columns: ["packageId"]; isOneToOne: false; referencedRelation: "DiamondPackage"; referencedColumns: ["id"] }
      ] };
      WebhookEvent: { Row: WebhookEventRow; Insert: WebhookEventInsert; Update: WebhookEventUpdate; Relationships: [] };
      FamilyLink: { Row: FamilyLinkRow; Insert: FamilyLinkInsert; Update: FamilyLinkUpdate; Relationships: [
        { foreignKeyName: "FamilyLink_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "FamilyLink_relativeId_fkey"; columns: ["relativeId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      Testimonial: { Row: TestimonialRow; Insert: TestimonialInsert; Update: TestimonialUpdate; Relationships: [
        { foreignKeyName: "Testimonial_profileId_fkey"; columns: ["profileId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] },
        { foreignKeyName: "Testimonial_authorId_fkey"; columns: ["authorId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      DiceRoll: { Row: DiceRollRow; Insert: DiceRollInsert; Update: DiceRollUpdate; Relationships: [
        { foreignKeyName: "DiceRoll_conversationId_fkey"; columns: ["conversationId"]; isOneToOne: false; referencedRelation: "Conversation"; referencedColumns: ["id"] },
        { foreignKeyName: "DiceRoll_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
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
      Playlist: { Row: PlaylistRow; Insert: PlaylistInsert; Update: Partial<PlaylistInsert>; Relationships: [] };
      PlaylistTrack: { Row: PlaylistTrackRow; Insert: PlaylistTrackInsert; Update: Partial<PlaylistTrackInsert>; Relationships: [
        { foreignKeyName: "PlaylistTrack_playlistId_fkey"; columns: ["playlistId"]; isOneToOne: false; referencedRelation: "Playlist"; referencedColumns: ["id"] },
        { foreignKeyName: "PlaylistTrack_trackId_fkey"; columns: ["trackId"]; isOneToOne: false; referencedRelation: "Track"; referencedColumns: ["id"] }
      ] };
      Track: { Row: TrackRow; Insert: TrackInsert; Update: TrackUpdate; Relationships: [
        { foreignKeyName: "Track_userId_fkey"; columns: ["userId"]; isOneToOne: false; referencedRelation: "User"; referencedColumns: ["id"] }
      ] };
      User: { Row: UserRow; Insert: UserInsert; Update: UserUpdate; Relationships: [] };
      Waitlist: { Row: WaitlistRow; Insert: WaitlistInsert; Update: WaitlistUpdate; Relationships: [] };
      SecurityEvent: {
        Row: { id: number; userId: string | null; kind: string; severity: string; ip: string | null; userAgent: string | null; details: Json; createdAt: string; actorId: string | null; resourceType: string | null; resourceId: string | null; result: string; ipHash: string | null; uaHash: string | null };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_diamond_order: { Args: { p_package_id: string }; Returns: Json };
      diamond_attach_provider_ref: { Args: { p_order_id: string; p_provider_ref: string }; Returns: void };
      diamond_credit_order: { Args: { p_order_id: string; p_provider_payment_id: string; p_raw_status?: string | null; p_amount_brl?: number | null }; Returns: Json };
      diamond_fail_order: { Args: { p_order_id: string; p_status: string; p_raw_status?: string | null }; Returns: void };
      send_gift_to_user: { Args: { p_recipient_id: string; p_product_id: string; p_note?: string | null; p_context?: string | null }; Returns: Json };
      my_diamond_history: { Args: { p_limit?: number }; Returns: { id: string; kind: string; amount: number; balanceAfter: number; description: string; createdAt: string; amountBRL: number | null; status: string | null }[] };
      admin_diamond_packages: { Args: Record<string, never>; Returns: DiamondPackageRow[] };
      admin_save_diamond_package: { Args: { p_id: string; p_diamonds: number; p_price: number; p_label?: string | null; p_badge?: string | null; p_sort?: number; p_active?: boolean }; Returns: DiamondPackageRow };
      admin_gifts: { Args: Record<string, never>; Returns: { id: string; name: string; description: string; image: string; priceCoins: number; active: boolean; badge: string | null; sortOrder: number }[] };
      admin_save_gift: { Args: { p_id: string; p_name: string; p_image: string; p_price: number; p_active?: boolean; p_description?: string; p_badge?: string | null; p_sort?: number }; Returns: string };
      admin_toggle_gift: { Args: { p_id: string; p_active: boolean }; Returns: void };
      admin_finance_overview: { Args: Record<string, never>; Returns: Json };
      admin_diamond_orders: { Args: { p_status?: string | null; p_limit?: number }; Returns: { id: string; userId: string; username: string; name: string; diamonds: number; amountBRL: number; status: string; provider: string; providerPaymentId: string | null; createdAt: string; paidAt: string | null }[] };
      admin_user_wallet: { Args: { p_query: string }; Returns: Json };
      admin_adjust_diamonds: { Args: { p_user: string; p_amount: number; p_reason: string }; Returns: Json };
      family_relations: { Args: Record<string, never>; Returns: string[] };
      family_default_inverse: { Args: { p_relation: string }; Returns: string };
      family_add: { Args: { p_relative_id: string; p_relation: string }; Returns: Json };
      save_profile_about: { Args: { p: Json }; Returns: Json };
      profile_about: { Args: { p_user: string }; Returns: Json };
      family_respond: { Args: { p_link_id: string; p_accept: boolean; p_relation?: string | null }; Returns: Json };
      family_remove: { Args: { p_relative_id: string }; Returns: void };
      family_of: { Args: { p_user_id: string }; Returns: { relativeId: string; relation: string; username: string; name: string; avatarUrl: string | null; isVerified: boolean }[] };
      family_requests: { Args: Record<string, never>; Returns: { id: string; userId: string; username: string; name: string; avatarUrl: string | null; relation: string; createdAt: string }[] };
      family_sent: { Args: Record<string, never>; Returns: { id: string; relativeId: string; username: string; name: string; avatarUrl: string | null; relation: string; createdAt: string }[] };
      family_update_relation: { Args: { p_relative_id: string; p_relation: string }; Returns: void };
      testimonial_write: { Args: { p_profile_id: string; p_body: string }; Returns: Json };
      testimonial_moderate: { Args: { p_id: string; p_action: string }; Returns: void };
      testimonials_of: { Args: { p_profile_id: string }; Returns: { id: string; authorId: string; username: string; name: string; avatarUrl: string | null; isVerified: boolean; body: string; createdAt: string }[] };
      testimonials_pending: { Args: Record<string, never>; Returns: { id: string; authorId: string; username: string; name: string; avatarUrl: string | null; body: string; createdAt: string }[] };
      my_testimonial_for: { Args: { p_profile_id: string }; Returns: { body: string; status: string }[] };
      roll_dice: { Args: { p_conversation_id: string; p_expr: string }; Returns: Json };
      my_sessions: {
        Args: Record<string, never>;
        Returns: { id: string; device: string; ip: string | null; createdAt: string; lastActiveAt: string; current: boolean; mfaVerified: boolean }[];
      };
      revoke_session: { Args: { p_session: string }; Returns: boolean };
      respond_follow_request: { Args: { p_follower: string; p_accept: boolean }; Returns: string };
      platform_role: { Args: Record<string, never>; Returns: string };
      compute_zodiac: { Args: { birth: string }; Returns: string };
      username_available: { Args: { check_username: string }; Returns: boolean };
      generate_orbit_id: { Args: Record<string, never>; Returns: string };
      finalize_new_user: {
        Args: { p_user_id: string; p_birth_date: string | null; p_gender: string | null; p_terms_version: string | null; p_privacy_version: string | null };
        Returns: void;
      };
      complete_signup: {
        Args: { p_birth_date: string | null; p_gender: string | null; p_terms_version: string | null; p_privacy_version: string | null };
        Returns: void;
      };
      get_or_create_dm: { Args: { other_user_id: string }; Returns: string };
      presence_heartbeat: { Args: { p_session: string; p_device: string; p_device_type: string; p_visibility: string; p_last_activity: string | null }; Returns: Json };
      presence_end_session: { Args: { p_session: string }; Returns: string };
      presence_sign_out: { Args: { p_session?: string | null }; Returns: string };
      presence_set_visibility: { Args: { p_show: boolean }; Returns: string };
      presence_my_mode: { Args: Record<string, never>; Returns: Json };
      presence_set_mode: { Args: { p_mode: string }; Returns: Json };
      my_badge_counts: { Args: Record<string, never>; Returns: { messages: number; friendRequests: number; notifications: number }[] };
      mark_conversation_read: { Args: { conversation_id: string }; Returns: undefined };
      mark_friend_requests_seen: { Args: Record<string, never>; Returns: undefined };
      android_cert_fingerprint: { Args: Record<string, never>; Returns: string | null };
      push_public_key: { Args: Record<string, never>; Returns: string | null };
      save_push_subscription: { Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_user_agent?: string | null }; Returns: undefined };
      remove_push_subscription: { Args: { p_endpoint: string }; Returns: undefined };
      create_community: { Args: { p_name: string; p_description?: string | null; p_category?: string | null }; Returns: string };
      public_profile_details: {
        Args: { target_user_id: string };
        Returns: {
          age: number | null;
          zodiacSign: string | null;
          location: string | null;
          website: string | null;
          interests: string | null;
          relationshipStatus: string | null;
          showAge: boolean;
          showSign: boolean;
          showLocation: boolean;
          showInterests: boolean;
          showRelationship: boolean;
        }[];
      };
      my_account_details: {
        Args: Record<string, never>;
        Returns: {
          email: string | null;
          phone: string | null;
          termsAcceptedAt: string | null;
          privacyAcceptedAt: string | null;
          hasProfileRow: boolean;
          birthDate: string | null;
          gender: string | null;
          location: string | null;
          website: string | null;
          interests: string | null;
          relationshipStatus: string | null;
          showAge: boolean;
          showSign: boolean;
          showLocation: boolean;
          showInterests: boolean;
          showRelationship: boolean;
          familyVisibility: string;
        }[];
      };
      send_friend_request: { Args: { target_user_id: string }; Returns: string };
      respond_friend_request: { Args: { requester_id: string; accept: boolean }; Returns: string };
      cancel_friend_request: { Args: { target_user_id: string }; Returns: string };
      remove_friend: { Args: { other_user_id: string }; Returns: string };
      friendship_state: { Args: { other_user_id: string }; Returns: string };
      search_profiles: {
        Args: { search_query: string; limit_count?: number; offset_count?: number };
        Returns: {
          id: string;
          name: string;
          username: string;
          avatarUrl: string | null;
          bio: string | null;
          isVerified: boolean;
          isPrivate: boolean;
          presence: string;
          isFollowing: boolean;
          friendState: string;
        }[];
      };
      my_conversations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          isGroup: boolean;
          isSaved: boolean;
          name: string | null;
          avatarUrl: string | null;
          description: string | null;
          memberCount: number;
          role: string;
          archivedAt: string | null;
          mutedUntil: string | null;
          theme: string | null;
          wallpaper: string | null;
          messageTtlSeconds: number | null;
          othersReadAt: string | null;
          otherUser: Json | null;
          lastMessage: Json | null;
          unread: number;
          sortAt: string;
          sendStatus: string;
        }[];
      };
      conversation_send_status: { Args: { conversation_id: string }; Returns: string };
      mark_messages_delivered: { Args: Record<string, never>; Returns: undefined };
      delete_message: { Args: { message_id: string; for_everyone: boolean }; Returns: Json };
      toggle_reaction: { Args: { message_id: string; emoji: string }; Returns: string | null };
      vote_poll: { Args: { message_id: string; option_indexes: number[] }; Returns: undefined };
      toggle_favorite: { Args: { message_id: string }; Returns: boolean };
      update_conversation_setting: { Args: { conversation_id: string; patch: Json }; Returns: undefined };
      clear_conversation: { Args: { conversation_id: string }; Returns: undefined };
      create_group: { Args: { p_name: string; p_member_ids: string[]; p_avatar_url?: string | null }; Returns: string };
      update_group: { Args: { p_conversation_id: string; p_name: string; p_description: string | null; p_avatar_url: string | null }; Returns: undefined };
      add_group_members: { Args: { p_conversation_id: string; p_member_ids: string[] }; Returns: number };
      remove_group_member: { Args: { p_conversation_id: string; p_user_id: string }; Returns: undefined };
      set_group_admin: { Args: { p_conversation_id: string; p_user_id: string; p_admin: boolean }; Returns: undefined };
      group_config: { Args: { p_conversation_id: string }; Returns: Json };
      set_group_permissions: { Args: { p_conversation_id: string; p_patch: Json; p_no_forward?: boolean | null }; Returns: undefined };
      set_group_system_messages: { Args: { p_conversation_id: string; p_on: boolean }; Returns: undefined };
      pin_conversation_message: { Args: { p_conversation_id: string; p_message_id: string | null }; Returns: undefined };
      group_invite_code: { Args: { p_conversation_id: string; p_reset?: boolean }; Returns: string };
      group_invite_preview: { Args: { p_code: string }; Returns: Json };
      join_group_by_code: { Args: { p_code: string }; Returns: string };
      set_conversation_ttl: { Args: { p_conversation_id: string; p_seconds: number | null }; Returns: undefined };
      ensure_saved_chat: { Args: Record<string, never>; Returns: string };
      save_to_saved: { Args: { p_message_id: string; p_attachments: Json }; Returns: string };
      toggle_sticker_favorite: { Args: { p_sticker: string }; Returns: boolean };
      my_recent_stickers: { Args: { p_limit?: number }; Returns: { sticker: string; lastUsedAt: string }[] };
      popular_stickers: { Args: { p_limit?: number }; Returns: { sticker: string; uses: number }[] };
      set_sticker_pack_installed: { Args: { p_pack: string; p_installed: boolean }; Returns: boolean };
      toggle_sticker_pack_favorite: { Args: { p_pack: string }; Returns: boolean };
      search_stickers: { Args: { p_query: string; p_limit?: number }; Returns: Json };
      sticker_readable: { Args: { p_sticker: string }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_save_pack: { Args: { p: Json }; Returns: string };
      admin_save_sticker: { Args: { p: Json }; Returns: string };
      admin_delete_sticker: { Args: { p_sticker: string }; Returns: string };
      admin_delete_pack: { Args: { p_pack: string }; Returns: string };
      community_join: { Args: { p_community: string; p_message?: string }; Returns: string };
      community_cancel_request: { Args: { p_community: string }; Returns: undefined };
      community_leave: { Args: { p_community: string }; Returns: undefined };
      community_decide_request: { Args: { p_community: string; p_user: string; p_approve: boolean }; Returns: undefined };
      community_set_role: { Args: { p_community: string; p_user: string; p_role: string }; Returns: undefined };
      community_remove_member: { Args: { p_community: string; p_user: string; p_ban?: boolean; p_reason?: string }; Returns: undefined };
      community_unban: { Args: { p_community: string; p_user: string }; Returns: undefined };
      community_set_notify: { Args: { p_community: string; p_on: boolean }; Returns: undefined };
      community_update: { Args: { p_community: string; p: Json }; Returns: string };
      community_create_post: { Args: { p_community: string; p: Json }; Returns: Json };
      community_edit_post: { Args: { p_post: string; p_content: string; p_link?: string | null }; Returns: undefined };
      community_post_action: { Args: { p_post: string; p_action: string }; Returns: undefined };
      community_comment_action: { Args: { p_comment: string; p_action: string }; Returns: undefined };
      community_vote_poll: { Args: { p_post: string; p_options: number[] }; Returns: undefined };
      community_view: { Args: { p_post: string }; Returns: undefined };
      community_create_discussion: { Args: { p_community: string; p_title: string; p_body: string; p_image?: string | null; p_category?: string; p_as_community?: boolean }; Returns: Json };
      community_perm: { Args: { p_user: string; p_community: string; p_perm: string }; Returns: boolean };
      community_my_perms: { Args: { p_community: string }; Returns: Json };
      community_roles_of: { Args: { p_user: string; p_community: string }; Returns: Json };
      community_member_badges: { Args: { p_user: string }; Returns: Json };
      profile_hidden_communities: { Args: { p_user: string }; Returns: string[] };
      call_start: { Args: { p_conversation: string; p_kind: string }; Returns: string };
      call_update: { Args: { p_call: string; p_action: string }; Returns: string };
      profile_visible_community_ids: { Args: { p_user: string }; Returns: string[] };
      community_eff_rank: { Args: { p_user: string; p_community: string }; Returns: number };
      community_save_role: { Args: { p_community: string; p: Json }; Returns: string };
      community_delete_role: { Args: { p_role: string }; Returns: undefined };
      community_assign_role: { Args: { p_community: string; p_user: string; p_role: string; p_on: boolean }; Returns: undefined };
      community_set_overrides: { Args: { p_community: string; p_user: string; p: Json }; Returns: undefined };
      community_transfer_owner: { Args: { p_community: string; p_user: string }; Returns: undefined };
      community_set_status: { Args: { p_community: string; p_status: string }; Returns: undefined };
      community_delete: { Args: { p_community: string; p_confirm: string }; Returns: undefined };
      community_tab_save: { Args: { p_community: string; p: Json }; Returns: string };
      community_tab_delete: { Args: { p_tab: string }; Returns: undefined };
      community_tab_reorder: { Args: { p_community: string; p_ids: string[] }; Returns: undefined };
      community_tab_assign: { Args: { p_post: string; p_tab: string; p_on: boolean }; Returns: undefined };
      community_set_suffix: { Args: { p_community: string; p_suffix: string }; Returns: undefined };
      community_hashtag_save: { Args: { p_community: string; p: Json }; Returns: string };
      community_hashtag_delete: { Args: { p_hashtag: string }; Returns: undefined };
      community_hashtag_reorder: { Args: { p_community: string; p_ids: string[] }; Returns: undefined };
      community_hashtags: { Args: { p_community: string }; Returns: { id: string; label: string; slug: string; tag: string; sortOrder: number; count: number }[] };
      community_hashtag_posts: { Args: { p_community: string; p_slug: string; p_limit?: number; p_offset?: number }; Returns: { id: string; kind: string; content: string; createdAt: string; authorId: string; authorType: string }[] };
      search_community_topics: { Args: { p_query: string; p_limit?: number }; Returns: { communityId: string; communityName: string; communitySlug: string; communityAvatar: string | null; suffix: string; id: string; label: string; tag: string; count: number }[] };
      rpg_set_config: { Args: { p_community: string; p: Json }; Returns: undefined };
      rpg_config: { Args: { p_community: string }; Returns: { isRpg: boolean; requireApproval: boolean; whoCanCreate: string; allowHtml: boolean; intro: string | null; canManage: boolean; canCreate: boolean; myCharacterId: string | null }[] };
      rpg_field_save: { Args: { p_community: string; p: Json }; Returns: string };
      rpg_field_delete: { Args: { p_field: string }; Returns: undefined };
      rpg_field_reorder: { Args: { p_community: string; p_ids: string[] }; Returns: undefined };
      rpg_fields: { Args: { p_community: string }; Returns: { id: string; fkey: string; label: string; type: string; options: Json; required: boolean; section: string | null; sortOrder: number }[] };
      rpg_character_save: { Args: { p_community: string; p: Json }; Returns: string };
      rpg_character_delete: { Args: { p_character: string }; Returns: undefined };
      rpg_character_moderate: { Args: { p_character: string; p_approve: boolean; p_reason?: string | null }; Returns: undefined };
      rpg_character_get: { Args: { p_community: string; p_user: string }; Returns: { id: string; userId: string; name: string; role: string | null; quote: string | null; avatarUrl: string | null; coverUrl: string | null; theme: string; customHtml: string | null; status: string; rejectReason: string | null; values: Json; gallery: Json; ownerName: string; ownerUsername: string; ownerAvatar: string | null; isMine: boolean; canManage: boolean }[] };
      rpg_characters: { Args: { p_community: string; p_limit?: number; p_offset?: number }; Returns: { id: string; userId: string; name: string; role: string | null; avatarUrl: string | null; status: string; ownerName: string; ownerUsername: string }[] };
      my_rpg_characters: { Args: Record<string, never>; Returns: { communityId: string; communityName: string; communitySlug: string; communityAvatar: string | null; id: string; name: string; role: string | null; status: string; avatarUrl: string | null }[] };
      community_register_download: { Args: { p_post: string; p_media?: string | null }; Returns: undefined };
      community_download_stats: { Args: { p_post: string }; Returns: Json };
      community_download_audit: { Args: { p_community: string; p_limit?: number; p_offset?: number }; Returns: Json };
      community_activity: { Args: { p_community: string; p_days?: number }; Returns: Json };
      community_set_welcome: { Args: { p_community: string; p: Json }; Returns: undefined };
      community_set_rules: { Args: { p_community: string; p: Json }; Returns: undefined };
      community_set_notify_level: { Args: { p_community: string; p_level: string }; Returns: undefined };
      community_send_broadcast: { Args: { p_community: string; p_title: string; p_message: string; p_href?: string | null }; Returns: undefined };
      community_mark_original: { Args: { p_post: string; p_on: boolean }; Returns: undefined };
      community_edit_discussion: { Args: { p_discussion: string; p_title: string; p_body: string; p_category: string }; Returns: undefined };
      community_discussion_like: { Args: { p_discussion: string }; Returns: Json };
      community_repost: { Args: { p_post: string; p_comment?: string }; Returns: string };
      community_mute: { Args: { p_community: string; p_user: string; p_minutes?: number | null; p_reason?: string }; Returns: undefined };
      community_unmute: { Args: { p_community: string; p_user: string }; Returns: undefined };
      community_save_event: { Args: { p_community: string; p_id: string | null; p: Json }; Returns: string };
      community_event_action: { Args: { p_event: string; p_action: string }; Returns: undefined };
      community_event_rsvp: { Args: { p_event: string; p_status: string | null }; Returns: Json };
      community_create_story: { Args: { p_community: string; p: Json }; Returns: string };
      story_create: { Args: { p: Json }; Returns: string };
      story_view: { Args: { p_moment: string }; Returns: undefined };
      story_react: { Args: { p_moment: string; p_emoji: string | null }; Returns: undefined };
      story_vote: { Args: { p_moment: string; p_option: number }; Returns: Json };
      story_poll_results: { Args: { p_moment: string }; Returns: Json };
      story_delete: { Args: { p_moment: string }; Returns: undefined };
      story_viewers: { Args: { p_moment: string }; Returns: { userId: string; name: string; username: string; avatarUrl: string | null; emoji: string | null; viewedAt: string }[] };
      community_open_chat: { Args: { p_community: string }; Returns: string };
      community_invite: { Args: { p_community: string; p_users: string[] }; Returns: number };
      community_moments: { Args: { p_community: string; p_before?: string | null; p_limit?: number }; Returns: Json };
      community_reply_discussion: { Args: { p_discussion: string; p_content: string }; Returns: Json };
      community_discussion_action: { Args: { p_discussion: string; p_action: string }; Returns: undefined };
      community_reply_action: { Args: { p_reply: string; p_action: string }; Returns: undefined };
      community_save_album: { Args: { p_community: string; p_id: string | null; p_title: string; p_description?: string; p_cover?: string | null }; Returns: string };
      community_delete_album: { Args: { p_album: string }; Returns: undefined };
      community_resolve_report: { Args: { p_report: string; p_status: string }; Returns: undefined };
      community_stats: { Args: { p_community: string; p_days?: number }; Returns: Json };
      admin_sticker_stats: {
        Args: Record<string, never>;
        Returns: { packId: string; sales: number; revenue: number; installs: number; favorites: number; stickerFavorites: number; sends: number; senders: number }[];
      };
      admin_security_overview: { Args: { p_hours?: number }; Returns: Json };
      admin_coins_reconcile: {
        Args: Record<string, never>;
        Returns: { userId: string; balance: number; ledgerSum: number; lastBalanceAfter: number; ok: boolean }[];
      };
      admin_overview: { Args: Record<string, never>; Returns: Json };
      admin_stats: { Args: { p_days?: number }; Returns: Json };
      admin_users: {
        Args: { p_search?: string | null; p_status?: string | null; p_limit?: number; p_offset?: number };
        Returns: { id: string; name: string; username: string; avatarUrl: string | null; email: string | null; role: string; accountStatus: string; isVerified: boolean; presence: string | null; createdAt: string; lastSeenAt: string | null; posts: number; reports: number; total: number }[];
      };
      admin_user_action: { Args: { p_user: string; p_action: string }; Returns: undefined };
      admin_contents: {
        Args: { p_search?: string | null; p_kind?: string | null; p_limit?: number; p_offset?: number };
        Returns: { id: string; content: string; kind: string | null; visibility: string; moderationStatus: string; createdAt: string; authorId: string; authorName: string; authorUsername: string; authorAvatarUrl: string | null; communityId: string | null; imageUrl: string | null; likes: number; comments: number; reports: number; total: number }[];
      };
      admin_content_action: { Args: { p_post: string; p_action: string }; Returns: undefined };
      admin_communities: {
        Args: { p_search?: string | null; p_limit?: number; p_offset?: number };
        Returns: { id: string; name: string; slug: string; avatarUrl: string | null; category: string | null; isPrivate: boolean; isOfficial: boolean; memberCount: number; createdAt: string; ownerName: string | null; posts: number; total: number }[];
      };
      admin_reports: {
        Args: { p_status?: string; p_limit?: number; p_offset?: number };
        Returns: { id: string; targetType: string; targetId: string; reason: string; details: string | null; status: string; createdAt: string; reporterName: string | null; reporterUsername: string | null; targetLabel: string | null; total: number }[];
      };
      admin_resolve_report: { Args: { p_report: string; p_status: string }; Returns: undefined };
      export_my_data: { Args: Record<string, never>; Returns: Json };
      reorder_playlist: { Args: { p_playlist: string; p_tracks: string[] }; Returns: undefined };
      admin_set_track_hidden: { Args: { p_track: string; p_hidden: boolean }; Returns: undefined };
      admin_save_track: {
        Args: {
          p_id: string | null;
          p_title: string;
          p_artist: string;
          p_album: string | null;
          p_genre: string;
          p_audio_url: string | null;
          p_cover_url: string | null;
          p_youtube_id: string | null;
          p_duration: number | null;
          p_license: string | null;
        };
        Returns: string;
      };
      my_storage_files: { Args: Record<string, never>; Returns: { bucket: string; name: string }[] };
      account_deletion_check: { Args: { p_confirm: string }; Returns: Json };
      deactivate_my_account: { Args: { p_confirm: string }; Returns: string };
      my_deactivation: { Args: Record<string, never>; Returns: string | null };
      restore_my_account: { Args: Record<string, never>; Returns: undefined };
      is_user_deactivated: { Args: { p_user: string }; Returns: boolean };
      accounts_due_for_deletion: { Args: Record<string, never>; Returns: string[] };
      finalize_account_deletion: { Args: { p_user: string }; Returns: { bucket: string; name: string }[] };
      admin_grant_pack: { Args: { p_user: string; p_pack: string }; Returns: undefined };
      admin_revoke_pack: { Args: { p_user: string; p_pack: string }; Returns: undefined };
      admin_packs_for: {
        Args: { p_user: string };
        Returns: { id: string; name: string; tier: string; published: boolean; ownedSource: string | null }[];
      };
      admin_grant_product: { Args: { p_user: string; p_product: string }; Returns: undefined };
      admin_revoke_product: { Args: { p_user: string; p_product: string }; Returns: undefined };
      admin_products_for: {
        Args: { p_user: string; p_kind: string };
        Returns: { id: string; refId: string | null; name: string; image: string | null; kind: string; tier: string | null; priceCoins: number; ownedSource: string | null }[];
      };
      my_coin_balance: { Args: Record<string, never>; Returns: number };
      acquire_product: { Args: { p_product_id: string }; Returns: Json };
      toggle_inventory_favorite: { Args: { p_product_id: string }; Returns: boolean };
      remove_inventory_item: { Args: { p_product_id: string }; Returns: undefined };
      send_gift: { Args: { p_conversation_id: string; p_product_id: string; p_recipient_id?: string | null; p_note?: string | null }; Returns: string };
      search_messenger: {
        Args: { p_query?: string | null; p_kind?: string; p_before?: string | null; p_limit?: number };
        Returns: {
          id: string;
          conversationId: string;
          chatTitle: string | null;
          isGroup: boolean;
          isSaved: boolean;
          senderId: string;
          senderName: string | null;
          type: string;
          content: string;
          preview: string;
          attachments: Json;
          createdAt: string;
        }[];
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
          likeCount: number;
          commentCount: number;
          imageUrl: string | null;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
