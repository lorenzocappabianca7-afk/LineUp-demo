import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSubscriber } from "@/hooks/use-landing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2, Mail, Send, CheckCircle, Gift, PartyPopper } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending } = useCreateSubscriber();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values, {
      onSuccess: () => {
        form.reset();
        setSubmitted(true);
      }
    });
  }

  return (
    <section id="waitlist" className="py-16 md:py-24 relative overflow-hidden bg-black text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 md:w-96 h-64 md:h-96 bg-[#7CB9E8]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 md:w-96 h-64 md:h-96 bg-[#4A9BD9]/10 rounded-full blur-3xl" />
      </div>
      <div className="container max-w-4xl mx-auto px-4 relative z-10 text-center">

        {submitted ? (
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 md:mb-6">
              <PartyPopper className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold font-display mb-3 md:mb-4">Sei dentro! 🎉</h2>
            <p className="text-base md:text-lg text-white/80 mb-4 md:mb-6">
              Ti abbiamo aggiunto alla lista d'attesa. Sarai tra i primi a provare LineUp!
            </p>
            <p className="text-xs md:text-sm text-white/50">Ti contatteremo presto via email con tutti i dettagli.</p>
          </div>
        ) : (
          <>
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-3 md:mb-4">Ready to get social?</h2>

            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-3 md:px-4 py-1.5 md:py-2 mb-6 md:mb-8">
              <Gift className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#7CB9E8] shrink-0" />
              <span className="text-xs md:text-sm font-semibold">I primi 10.000 iscritti ricevono <span className="text-[#7CB9E8]">€5 di credito</span> per le future prenotazioni</span>
            </div>

            <p className="text-base md:text-xl text-white/70 mb-8 md:mb-10 max-w-2xl mx-auto">
              Join 20,000+ others on the waitlist. Get early access, exclusive features, and be the first to know when we launch.
            </p>

            <div className="bg-white p-2 md:p-3 rounded-2xl shadow-2xl max-w-lg mx-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-2">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 md:w-5 md:h-5" />
                          <Input placeholder="Enter your email address" className="pl-10 md:pl-12 h-12 md:h-14 text-sm md:text-base border-0 bg-gray-50 focus-visible:ring-0 focus-visible:bg-gray-100 rounded-xl text-foreground" {...field} data-testid="input-email" />
                        </div>
                      </FormControl>
                      <FormMessage className="absolute mt-1 ml-2 text-red-500 font-medium" />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={isPending} className="h-12 md:h-14 px-6 md:px-8 rounded-xl bg-black text-white hover:bg-gray-800 text-sm md:text-base font-semibold border border-gray-700" data-testid="button-join">
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join Now <Send className="ml-2 w-4 h-4" /></>}
                  </Button>
                </form>
              </Form>
            </div>

            <p className="mt-4 md:mt-6 text-xs md:text-sm text-white/50 flex items-center justify-center gap-2"><CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />No spam, ever. Unsubscribe at any time.</p>
          </>
        )}
      </div>
    </section>
  );
}
