import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type CreateSubscriberInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// SUBSCRIBERS (Waitlist)
// ============================================

export function useCreateSubscriber() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CreateSubscriberInput) => {
      const validated = api.subscribers.create.input.parse(data);
      const res = await fetch(api.subscribers.create.path, {
        method: api.subscribers.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.subscribers.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 409) {
          const error = api.subscribers.create.responses[409].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to join waitlist');
      }
      return api.subscribers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Benvenuto a bordo! 🚀",
        description: "Sei stato aggiunto alla lista d'attesa di LineUp.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

// ============================================
// DEMO DATA (Stories & Chats)
// ============================================

export function useDemoStories() {
  return useQuery({
    queryKey: [api.demo.stories.list.path],
    queryFn: async () => {
      const res = await fetch(api.demo.stories.list.path);
      if (!res.ok) throw new Error('Failed to fetch demo stories');
      return api.demo.stories.list.responses[200].parse(await res.json());
    },
  });
}

export function useDemoChats() {
  return useQuery({
    queryKey: [api.demo.chats.list.path],
    queryFn: async () => {
      const res = await fetch(api.demo.chats.list.path);
      if (!res.ok) throw new Error('Failed to fetch demo chats');
      return api.demo.chats.list.responses[200].parse(await res.json());
    },
  });
}

// Keep legacy export for compatibility if components still use it temporarily
export function useDemoEvents() {
  return useQuery({
    queryKey: [api.demo.events.list.path],
    queryFn: async () => {
      const res = await fetch(api.demo.events.list.path);
      if (!res.ok) throw new Error('Failed to fetch demo events');
      return api.demo.events.list.responses[200].parse(await res.json());
    },
  });
}
