  import { useState, useEffect } from "react";
  import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Button } from "@/components/ui/button";
  import { useToast } from "@/hooks/use-toast";
  import axios from "axios";

  export default function GstConfigurationCard() {
    const [gst, setGst] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // ✅ Fetch current GST when component mounts
    useEffect(() => {
      const fetchGst = async () => {
  try {
    const res = await axios.get("/api/settings/getgst");
    console.log("GST API response:", res.data); 
    const gstValue = res.data?.gst;

    if (gstValue === undefined || gstValue === null) {
      throw new Error("GST value not found");
    }

    setGst(gstValue.toString());
  } catch (err) {
    console.error("Failed to fetch GST:", err);

    const message =
      err instanceof Error
        ? (err as any)?.response?.data?.message || err.message
        : "Unknown error";

    toast({
      title: "Error fetching GST",
      description: message,
      variant: "destructive",
    });
  }
};


      fetchGst();
    }, []);

    const handleSave = async () => {
      if (!gst || isNaN(parseFloat(gst))) {
        toast({ title: "Enter a valid GST percentage", variant: "destructive" });
        return;
      }

      try {
        setLoading(true);
        await axios.put("/api/settings/gst", { gst: parseFloat(gst) });

        toast({
          title: "GST Updated ✅",
          description: `New GST set to ${gst}%`,
        });
      } catch (err) {
          console.error("Failed to update GST:", err);

          const message =
              err instanceof Error
              ? (err as any).response?.data?.message || err.message
              : "Unknown error";

          toast({
              title: "Update Failed",
              description: message,
              variant: "destructive",
          });
          }

    };

    return (
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>GST Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">GST Percentage (%)</label>
            <Input
              type="number"
              step="0.01"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              placeholder="Enter GST"
            />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Saving..." : "💾 Save"}
          </Button>
        </CardContent>
      </Card>
    );
  }
