import { db } from "./db";
import {
  subscribers, pageViews,
  appEvents, appVotes, appMessages, appBanners, appProposals,
  type InsertSubscriber, type Subscriber,
  type InsertPageView, type PageView,
  type AppEvent, type InsertAppEvent,
  type AppVote, type InsertAppVote,
  type AppMessage, type InsertAppMessage,
  type AppBanner, type InsertAppBanner,
  type AppProposal, type InsertAppProposal,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getAllSubscribers(): Promise<Subscriber[]>;
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getAllPageViews(): Promise<PageView[]>;
  // App events
  createAppEvent(event: InsertAppEvent): Promise<AppEvent>;
  getAppEvents(): Promise<AppEvent[]>;
  getAppEvent(id: number): Promise<AppEvent | undefined>;
  updateAppEvent(id: number, updates: Partial<AppEvent>): Promise<AppEvent>;
  deleteAppEvent(id: number): Promise<void>;
  // Votes
  getVotesByEvent(eventId: number): Promise<AppVote[]>;
  createVote(vote: InsertAppVote): Promise<AppVote>;
  deleteVote(eventId: number, voterName: string, voteType: string, voteValue: string): Promise<void>;
  deleteVotesByType(eventId: number, voterName: string, voteType: string): Promise<void>;
  // Messages
  getMessagesByEvent(eventId: number): Promise<AppMessage[]>;
  createMessage(message: InsertAppMessage): Promise<AppMessage>;
  // Banners
  getBanners(): Promise<AppBanner[]>;
  createBanner(banner: InsertAppBanner): Promise<AppBanner>;
  deleteBanner(id: number): Promise<void>;
  // Proposals
  getProposalsByEvent(eventId: number): Promise<AppProposal[]>;
  createProposal(proposal: InsertAppProposal): Promise<AppProposal>;
  updateProposal(id: number, status: string): Promise<AppProposal>;
  deleteProposalsByEvent(eventId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const [subscriber] = await db.insert(subscribers).values(insertSubscriber).returning();
    return subscriber;
  }
  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    return subscriber;
  }
  async getAllSubscribers(): Promise<Subscriber[]> {
    return await db.select().from(subscribers).orderBy(subscribers.createdAt);
  }
  async createPageView(pv: InsertPageView): Promise<PageView> {
    const [view] = await db.insert(pageViews).values(pv).returning();
    return view;
  }
  async getAllPageViews(): Promise<PageView[]> {
    return await db.select().from(pageViews).orderBy(desc(pageViews.createdAt));
  }

  // ── App Events ──
  async createAppEvent(event: InsertAppEvent): Promise<AppEvent> {
    const [created] = await db.insert(appEvents).values(event).returning();
    return created;
  }
  async getAppEvents(): Promise<AppEvent[]> {
    return await db.select().from(appEvents).orderBy(desc(appEvents.createdAt));
  }
  async getAppEvent(id: number): Promise<AppEvent | undefined> {
    const [event] = await db.select().from(appEvents).where(eq(appEvents.id, id));
    return event;
  }
  async updateAppEvent(id: number, updates: Partial<AppEvent>): Promise<AppEvent> {
    const [updated] = await db.update(appEvents).set(updates).where(eq(appEvents.id, id)).returning();
    return updated;
  }

  // ── Votes ──
  async getVotesByEvent(eventId: number): Promise<AppVote[]> {
    return await db.select().from(appVotes).where(eq(appVotes.eventId, eventId));
  }
  async createVote(vote: InsertAppVote): Promise<AppVote> {
    const [created] = await db.insert(appVotes).values(vote).returning();
    return created;
  }
  async deleteVote(eventId: number, voterName: string, voteType: string, voteValue: string): Promise<void> {
    await db.delete(appVotes).where(
      and(
        eq(appVotes.eventId, eventId),
        eq(appVotes.voterName, voterName),
        eq(appVotes.voteType, voteType),
        eq(appVotes.voteValue, voteValue),
      )
    );
  }
  async deleteVotesByType(eventId: number, voterName: string, voteType: string): Promise<void> {
    await db.delete(appVotes).where(
      and(
        eq(appVotes.eventId, eventId),
        eq(appVotes.voterName, voterName),
        eq(appVotes.voteType, voteType),
      )
    );
  }

  // ── Messages ──
  async getMessagesByEvent(eventId: number): Promise<AppMessage[]> {
    return await db.select().from(appMessages).where(eq(appMessages.eventId, eventId)).orderBy(appMessages.createdAt);
  }
  async createMessage(message: InsertAppMessage): Promise<AppMessage> {
    const [created] = await db.insert(appMessages).values(message).returning();
    return created;
  }

  async deleteAppEvent(id: number): Promise<void> {
    await db.delete(appMessages).where(eq(appMessages.eventId, id));
    await db.delete(appVotes).where(eq(appVotes.eventId, id));
    await db.delete(appProposals).where(eq(appProposals.eventId, id));
    await db.delete(appEvents).where(eq(appEvents.id, id));
  }

  // ── Banners ──
  async getBanners(): Promise<AppBanner[]> {
    return await db.select().from(appBanners).orderBy(desc(appBanners.createdAt));
  }
  async createBanner(banner: InsertAppBanner): Promise<AppBanner> {
    const [created] = await db.insert(appBanners).values(banner).returning();
    return created;
  }
  async deleteBanner(id: number): Promise<void> {
    await db.delete(appBanners).where(eq(appBanners.id, id));
  }

  // ── Proposals ──
  async getProposalsByEvent(eventId: number): Promise<AppProposal[]> {
    return await db.select().from(appProposals)
      .where(eq(appProposals.eventId, eventId))
      .orderBy(appProposals.createdAt);
  }
  async createProposal(proposal: InsertAppProposal): Promise<AppProposal> {
    const [created] = await db.insert(appProposals).values(proposal).returning();
    return created;
  }
  async updateProposal(id: number, status: string): Promise<AppProposal> {
    const [updated] = await db.update(appProposals).set({ status }).where(eq(appProposals.id, id)).returning();
    return updated;
  }
  async deleteProposalsByEvent(eventId: number): Promise<void> {
    await db.delete(appProposals).where(eq(appProposals.eventId, eventId));
  }
}

export const storage = new DatabaseStorage();
