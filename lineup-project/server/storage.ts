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

class MemoryStorage implements IStorage {
  private subscribersData: Subscriber[] = [];
  private pageViewsData: PageView[] = [];
  private appEventsData: AppEvent[] = [];
  private appVotesData: AppVote[] = [];
  private appMessagesData: AppMessage[] = [];
  private appBannersData: AppBanner[] = [];
  private appProposalsData: AppProposal[] = [];

  private subscriberId = 1;
  private pageViewId = 1;
  private eventId = 1;
  private voteId = 1;
  private messageId = 1;
  private bannerId = 1;
  private proposalId = 1;

  async createSubscriber(insertSubscriber: InsertSubscriber): Promise<Subscriber> {
    const created: Subscriber = {
      id: this.subscriberId++,
      email: insertSubscriber.email,
      createdAt: new Date(),
    };
    this.subscribersData.push(created);
    return created;
  }
  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    return this.subscribersData.find((s) => s.email === email);
  }
  async getAllSubscribers(): Promise<Subscriber[]> {
    return [...this.subscribersData].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));
  }
  async createPageView(pv: InsertPageView): Promise<PageView> {
    const created: PageView = {
      id: this.pageViewId++,
      path: pv.path,
      userAgent: pv.userAgent ?? null,
      referrer: pv.referrer ?? null,
      ip: pv.ip ?? null,
      createdAt: new Date(),
    };
    this.pageViewsData.push(created);
    return created;
  }
  async getAllPageViews(): Promise<PageView[]> {
    return [...this.pageViewsData].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));
  }

  async createAppEvent(event: InsertAppEvent): Promise<AppEvent> {
    const created: AppEvent = {
      id: this.eventId++,
      activity: event.activity,
      title: event.title,
      status: event.status ?? "planning",
      createdBy: event.createdBy,
      participants: event.participants ?? "[]",
      dateOptions: event.dateOptions ?? "[]",
      timeOptions: event.timeOptions ?? "[]",
      venueOptions: event.venueOptions ?? "[]",
      confirmedDate: event.confirmedDate ?? null,
      confirmedTime: event.confirmedTime ?? null,
      confirmedVenue: event.confirmedVenue ?? null,
      createdAt: new Date(),
    };
    this.appEventsData.push(created);
    return created;
  }
  async getAppEvents(): Promise<AppEvent[]> {
    return [...this.appEventsData].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));
  }
  async getAppEvent(id: number): Promise<AppEvent | undefined> {
    return this.appEventsData.find((e) => e.id === id);
  }
  async updateAppEvent(id: number, updates: Partial<AppEvent>): Promise<AppEvent> {
    const idx = this.appEventsData.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error("Evento non trovato");
    const updated: AppEvent = { ...this.appEventsData[idx], ...updates };
    this.appEventsData[idx] = updated;
    return updated;
  }
  async deleteAppEvent(id: number): Promise<void> {
    this.appMessagesData = this.appMessagesData.filter((m) => m.eventId !== id);
    this.appVotesData = this.appVotesData.filter((v) => v.eventId !== id);
    this.appProposalsData = this.appProposalsData.filter((p) => p.eventId !== id);
    this.appEventsData = this.appEventsData.filter((e) => e.id !== id);
  }

  async getVotesByEvent(eventId: number): Promise<AppVote[]> {
    return this.appVotesData.filter((v) => v.eventId === eventId);
  }
  async createVote(vote: InsertAppVote): Promise<AppVote> {
    const created: AppVote = {
      id: this.voteId++,
      ...vote,
      createdAt: new Date(),
    };
    this.appVotesData.push(created);
    return created;
  }
  async deleteVote(eventId: number, voterName: string, voteType: string, voteValue: string): Promise<void> {
    this.appVotesData = this.appVotesData.filter(
      (v) =>
        !(
          v.eventId === eventId &&
          v.voterName === voterName &&
          v.voteType === voteType &&
          v.voteValue === voteValue
        ),
    );
  }
  async deleteVotesByType(eventId: number, voterName: string, voteType: string): Promise<void> {
    this.appVotesData = this.appVotesData.filter(
      (v) => !(v.eventId === eventId && v.voterName === voterName && v.voteType === voteType),
    );
  }

  async getMessagesByEvent(eventId: number): Promise<AppMessage[]> {
    return this.appMessagesData
      .filter((m) => m.eventId === eventId)
      .sort((a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0));
  }
  async createMessage(message: InsertAppMessage): Promise<AppMessage> {
    const created: AppMessage = {
      id: this.messageId++,
      ...message,
      createdAt: new Date(),
    };
    this.appMessagesData.push(created);
    return created;
  }

  async getBanners(): Promise<AppBanner[]> {
    return [...this.appBannersData].sort((a, b) => +new Date(b.createdAt ?? 0) - +new Date(a.createdAt ?? 0));
  }
  async createBanner(banner: InsertAppBanner): Promise<AppBanner> {
    const created: AppBanner = {
      id: this.bannerId++,
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      bgColor: banner.bgColor ?? "#4A9BD9",
      createdAt: new Date(),
    };
    this.appBannersData.push(created);
    return created;
  }
  async deleteBanner(id: number): Promise<void> {
    this.appBannersData = this.appBannersData.filter((b) => b.id !== id);
  }

  async getProposalsByEvent(eventId: number): Promise<AppProposal[]> {
    return this.appProposalsData
      .filter((p) => p.eventId === eventId)
      .sort((a, b) => +new Date(a.createdAt ?? 0) - +new Date(b.createdAt ?? 0));
  }
  async createProposal(proposal: InsertAppProposal): Promise<AppProposal> {
    const created: AppProposal = {
      id: this.proposalId++,
      eventId: proposal.eventId,
      proposerName: proposal.proposerName,
      proposalType: proposal.proposalType,
      proposalValue: proposal.proposalValue,
      status: proposal.status ?? "pending",
      createdAt: new Date(),
    };
    this.appProposalsData.push(created);
    return created;
  }
  async updateProposal(id: number, status: string): Promise<AppProposal> {
    const idx = this.appProposalsData.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Proposta non trovata");
    const updated: AppProposal = { ...this.appProposalsData[idx], status };
    this.appProposalsData[idx] = updated;
    return updated;
  }
  async deleteProposalsByEvent(eventId: number): Promise<void> {
    this.appProposalsData = this.appProposalsData.filter((p) => p.eventId !== eventId);
  }
}

class ResilientStorage implements IStorage {
  private readonly dbStorage = new DatabaseStorage();
  private readonly memoryStorage = new MemoryStorage();
  private useMemory = false;

  private isDbUnavailable(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const anyErr = err as { code?: string; message?: string };
    const msg = String(anyErr.message ?? "");
    return (
      anyErr.code === "ECONNREFUSED" ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("connect ECONNREFUSED")
    );
  }

  private async run<T>(opName: string, dbOp: () => Promise<T>, memOp: () => Promise<T>): Promise<T> {
    if (this.useMemory) return memOp();
    try {
      return await dbOp();
    } catch (err) {
      if (!this.isDbUnavailable(err)) throw err;
      this.useMemory = true;
      console.warn(`[storage] DB non raggiungibile, fallback in memoria attivato (${opName}).`);
      return memOp();
    }
  }

  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    return this.run("createSubscriber", () => this.dbStorage.createSubscriber(subscriber), () => this.memoryStorage.createSubscriber(subscriber));
  }
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    return this.run("getSubscriberByEmail", () => this.dbStorage.getSubscriberByEmail(email), () => this.memoryStorage.getSubscriberByEmail(email));
  }
  getAllSubscribers(): Promise<Subscriber[]> {
    return this.run("getAllSubscribers", () => this.dbStorage.getAllSubscribers(), () => this.memoryStorage.getAllSubscribers());
  }
  createPageView(pageView: InsertPageView): Promise<PageView> {
    return this.run("createPageView", () => this.dbStorage.createPageView(pageView), () => this.memoryStorage.createPageView(pageView));
  }
  getAllPageViews(): Promise<PageView[]> {
    return this.run("getAllPageViews", () => this.dbStorage.getAllPageViews(), () => this.memoryStorage.getAllPageViews());
  }
  createAppEvent(event: InsertAppEvent): Promise<AppEvent> {
    return this.run("createAppEvent", () => this.dbStorage.createAppEvent(event), () => this.memoryStorage.createAppEvent(event));
  }
  getAppEvents(): Promise<AppEvent[]> {
    return this.run("getAppEvents", () => this.dbStorage.getAppEvents(), () => this.memoryStorage.getAppEvents());
  }
  getAppEvent(id: number): Promise<AppEvent | undefined> {
    return this.run("getAppEvent", () => this.dbStorage.getAppEvent(id), () => this.memoryStorage.getAppEvent(id));
  }
  updateAppEvent(id: number, updates: Partial<AppEvent>): Promise<AppEvent> {
    return this.run("updateAppEvent", () => this.dbStorage.updateAppEvent(id, updates), () => this.memoryStorage.updateAppEvent(id, updates));
  }
  deleteAppEvent(id: number): Promise<void> {
    return this.run("deleteAppEvent", () => this.dbStorage.deleteAppEvent(id), () => this.memoryStorage.deleteAppEvent(id));
  }
  getVotesByEvent(eventId: number): Promise<AppVote[]> {
    return this.run("getVotesByEvent", () => this.dbStorage.getVotesByEvent(eventId), () => this.memoryStorage.getVotesByEvent(eventId));
  }
  createVote(vote: InsertAppVote): Promise<AppVote> {
    return this.run("createVote", () => this.dbStorage.createVote(vote), () => this.memoryStorage.createVote(vote));
  }
  deleteVote(eventId: number, voterName: string, voteType: string, voteValue: string): Promise<void> {
    return this.run("deleteVote", () => this.dbStorage.deleteVote(eventId, voterName, voteType, voteValue), () => this.memoryStorage.deleteVote(eventId, voterName, voteType, voteValue));
  }
  deleteVotesByType(eventId: number, voterName: string, voteType: string): Promise<void> {
    return this.run("deleteVotesByType", () => this.dbStorage.deleteVotesByType(eventId, voterName, voteType), () => this.memoryStorage.deleteVotesByType(eventId, voterName, voteType));
  }
  getMessagesByEvent(eventId: number): Promise<AppMessage[]> {
    return this.run("getMessagesByEvent", () => this.dbStorage.getMessagesByEvent(eventId), () => this.memoryStorage.getMessagesByEvent(eventId));
  }
  createMessage(message: InsertAppMessage): Promise<AppMessage> {
    return this.run("createMessage", () => this.dbStorage.createMessage(message), () => this.memoryStorage.createMessage(message));
  }
  getBanners(): Promise<AppBanner[]> {
    return this.run("getBanners", () => this.dbStorage.getBanners(), () => this.memoryStorage.getBanners());
  }
  createBanner(banner: InsertAppBanner): Promise<AppBanner> {
    return this.run("createBanner", () => this.dbStorage.createBanner(banner), () => this.memoryStorage.createBanner(banner));
  }
  deleteBanner(id: number): Promise<void> {
    return this.run("deleteBanner", () => this.dbStorage.deleteBanner(id), () => this.memoryStorage.deleteBanner(id));
  }
  getProposalsByEvent(eventId: number): Promise<AppProposal[]> {
    return this.run("getProposalsByEvent", () => this.dbStorage.getProposalsByEvent(eventId), () => this.memoryStorage.getProposalsByEvent(eventId));
  }
  createProposal(proposal: InsertAppProposal): Promise<AppProposal> {
    return this.run("createProposal", () => this.dbStorage.createProposal(proposal), () => this.memoryStorage.createProposal(proposal));
  }
  updateProposal(id: number, status: string): Promise<AppProposal> {
    return this.run("updateProposal", () => this.dbStorage.updateProposal(id, status), () => this.memoryStorage.updateProposal(id, status));
  }
  deleteProposalsByEvent(eventId: number): Promise<void> {
    return this.run("deleteProposalsByEvent", () => this.dbStorage.deleteProposalsByEvent(eventId), () => this.memoryStorage.deleteProposalsByEvent(eventId));
  }
}

export const storage: IStorage = new ResilientStorage();
