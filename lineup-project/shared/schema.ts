
import { pgTable, text, serial, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Utenti interessati (Lista d'attesa)
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSubscriberSchema = createInsertSchema(subscribers).omit({ id: true, createdAt: true });
export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;

// Page views tracking
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertPageViewSchema = createInsertSchema(pageViews).omit({ id: true, createdAt: true });
export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;

// ── PWA App Tables ──

// Events
export const appEvents = pgTable("app_events", {
  id: serial("id").primaryKey(),
  activity: text("activity").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("planning"),
  createdBy: text("created_by").notNull(),
  participants: text("participants").notNull().default("[]"),
  dateOptions: text("date_options").notNull().default("[]"),
  timeOptions: text("time_options").notNull().default("[]"),
  venueOptions: text("venue_options").notNull().default("[]"),
  confirmedDate: text("confirmed_date"),
  confirmedTime: text("confirmed_time"),
  confirmedVenue: text("confirmed_venue"),
  /** Modalità di sondaggio (vedi `shared/surveyModes.ts`). */
  surveyMode: text("survey_mode").notNull().default("flexible_voting"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAppEventSchema = createInsertSchema(appEvents).omit({ id: true, createdAt: true });
export type AppEvent = typeof appEvents.$inferSelect;
export type InsertAppEvent = z.infer<typeof insertAppEventSchema>;

// Votes
export const appVotes = pgTable("app_votes", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  voterName: text("voter_name").notNull(),
  voteType: text("vote_type").notNull(),
  voteValue: text("vote_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAppVoteSchema = createInsertSchema(appVotes).omit({ id: true, createdAt: true });
export type AppVote = typeof appVotes.$inferSelect;
export type InsertAppVote = z.infer<typeof insertAppVoteSchema>;

// Messages
export const appMessages = pgTable("app_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAppMessageSchema = createInsertSchema(appMessages).omit({ id: true, createdAt: true });
export type AppMessage = typeof appMessages.$inferSelect;
export type InsertAppMessage = z.infer<typeof insertAppMessageSchema>;

// App Banners (admin-managed notifications shown in chat tab)
export const appBanners = pgTable("app_banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  bgColor: text("bg_color").notNull().default("#4A9BD9"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAppBannerSchema = createInsertSchema(appBanners).omit({ id: true, createdAt: true });
export type AppBanner = typeof appBanners.$inferSelect;
export type InsertAppBanner = z.infer<typeof insertAppBannerSchema>;

// Proposals (participant suggestions pending creator approval)
export const appProposals = pgTable("app_proposals", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  proposerName: text("proposer_name").notNull(),
  proposalType: text("proposal_type").notNull(),
  proposalValue: text("proposal_value").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAppProposalSchema = createInsertSchema(appProposals).omit({ id: true, createdAt: true });
export type AppProposal = typeof appProposals.$inferSelect;
export type InsertAppProposal = z.infer<typeof insertAppProposalSchema>;

// Friends (owner → friend): chi può ricevere proposte e vedere note pubblicate "tutti i friends"
export const appFriends = pgTable("app_friends", {
  id: serial("id").primaryKey(),
  ownerName: text("owner_name").notNull(),
  friendName: text("friend_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppFriendSchema = createInsertSchema(appFriends).omit({ id: true, createdAt: true });
export type AppFriend = typeof appFriends.$inferSelect;
export type InsertAppFriend = z.infer<typeof insertAppFriendSchema>;

// Pubblicazione evento in bacheca "note" sopra le chat (una attiva per evento)
export const appEventPublications = pgTable("app_event_publications", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  publishedBy: text("published_by").notNull(),
  /** "all" = tutti i friends dell'autore; "selected" = solo friendNames */
  audience: text("audience").notNull(),
  friendNames: text("friend_names").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppEventPublicationSchema = createInsertSchema(appEventPublications).omit({
  id: true,
  createdAt: true,
});
export type AppEventPublication = typeof appEventPublications.$inferSelect;
export type InsertAppEventPublication = z.infer<typeof insertAppEventPublicationSchema>;

// Lettura nota (bordo grigio dopo visualizzazione)
export const appPublicationViews = pgTable(
  "app_publication_views",
  {
    publicationId: integer("publication_id").notNull(),
    viewerName: text("viewer_name").notNull(),
    viewedAt: timestamp("viewed_at").defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.publicationId, t.viewerName] }),
  }),
);

export type AppPublicationView = typeof appPublicationViews.$inferSelect;

// Richiesta di partecipazione a evento pubblicato
export const appJoinRequests = pgTable("app_join_requests", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  requesterName: text("requester_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppJoinRequestSchema = createInsertSchema(appJoinRequests).omit({ id: true, createdAt: true });
export type AppJoinRequest = typeof appJoinRequests.$inferSelect;
export type InsertAppJoinRequest = z.infer<typeof insertAppJoinRequestSchema>;

// Legacy tables kept for compatibility
export const demoStories = pgTable("demo_stories", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  imageUrl: text("image_url").notNull(),
  date: timestamp("date").notNull(),
  caption: text("caption"),
});
export const demoChats = pgTable("demo_chats", {
  id: serial("id").primaryKey(),
  groupName: text("group_name").notNull(),
  date: timestamp("date").notNull(),
  lastMessage: text("last_message"),
  availabilityCount: integer("availability_count").default(0),
});
export const demoEvents = pgTable("demo_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
});

/** Feedback demo QR Pianifica — persistente su Postgres (sopravvive al cold start Render). */
export const pianificaDemoFeedbacks = pgTable("pianifica_demo_feedbacks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PianificaDemoFeedbackRow = typeof pianificaDemoFeedbacks.$inferSelect;
