import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Video,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

const faqs = [
  {
    question: "How do I add a new property?",
    answer: "Navigate to the Properties page and click the 'Add Property' button. Fill in the property details including address, type, number of units, and monthly rent. Click 'Add Property' to save.",
  },
  {
    question: "How do I record a rent payment?",
    answer: "Go to the Payments page and find the pending payment in the table. Click 'Record Payment' to confirm. You can now specify the payment method (including M-Pesa or Bank Transfer) and add a transaction reference code.",
  },
  {
    question: "How do I create a maintenance request?",
    answer: "On the Maintenance page, click 'New Request'. Select the property, describe the issue, choose a priority level and category, then submit. The request will appear in the 'New' column.",
  },
  {
    question: "How do I contact a tenant?",
    answer: "Go to the Tenants page. Click the three-dot menu next to a tenant's name. You can directly 'Send Email' or 'Call Tenant' from there, or view their full details.",
  },
  {
    question: "How do I change my currency settings?",
    answer: "Visit the Settings page. In the 'Preferences' section, you can select your preferred currency (e.g., KES, USD) which will be used across the dashboard.",
  },
  {
    question: "How do I change my notification settings?",
    answer: "Visit the Settings page and scroll to the Notifications section. Toggle the switches to enable or disable different notification types.",
  },
];

const resources = [
  {
    title: "Getting Started Guide",
    description: "Learn the basics of PropertyPro",
    icon: FileText,
  },
  {
    title: "Video Tutorials",
    description: "Watch step-by-step walkthroughs",
    icon: Video,
  },
  {
    title: "Best Practices",
    description: "Tips for efficient property management",
    icon: HelpCircle,
  },
];

export default function Help() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Help Center</h1>
        <p className="text-muted-foreground mt-1">Find answers and get support</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for help articles..."
          className="pl-10"
          data-testid="input-search-help"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        {resources.map((resource) => (
          <Card key={resource.title} className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-accent flex items-center justify-center">
                <resource.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-sm">{resource.title}</h3>
                <p className="text-xs text-muted-foreground">{resource.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left" data-testid={`accordion-faq-${index}`}>
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Support</CardTitle>
          <CardDescription>Need more help? Get in touch with our team.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-sm">WhatsApp</h3>
                <p className="text-xs text-muted-foreground">Chat with us directly</p>
              </div>
            </div>
            <a href="mailto:hanmw009@gmail.com" className="flex items-center gap-4 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Mail className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Email Us</h3>
                <p className="text-xs text-muted-foreground">hanmw009@gmail.com</p>
              </div>
            </a>
            <a href="tel:+254717517114" className="flex items-center gap-4 p-4 rounded-md bg-muted/50 hover:bg-muted transition-colors">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Phone className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Call Us</h3>
                <p className="text-xs text-muted-foreground">+254 717517114</p>
              </div>
            </a>
          </div>

          <div className="mt-6 flex justify-center">
            <Button data-testid="button-submit-ticket">
              <MessageCircle className="h-4 w-4 mr-2" />
              Submit a Support Ticket
            </Button>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
