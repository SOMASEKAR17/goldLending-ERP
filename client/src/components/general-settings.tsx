import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import GstConfigurationCard from '@/components/gst-configuration';

export default function CategoryCreationCard() {
  const [categoryName, setCategoryName] = useState("");
  const [ranges, setRanges] = useState([{ from: "", to: "", interest: "" }]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("/api/loan-categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const handleAddRange = () => {
    setRanges([...ranges, { from: "", to: "", interest: "" }]);
  };

  const handleRemoveRange = (index: number) => {
    const newRanges = [...ranges];
    newRanges.splice(index, 1);
    setRanges(newRanges);
  };

  const handleRangeChange = (index: number, key: string, value: string) => {
    const updated = [...ranges];
    updated[index][key as keyof typeof updated[0]] = value;
    setRanges(updated);
  };

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      toast({ title: "Category name is required", variant: "destructive" });
      return;
    }

    if (ranges.some(r => !r.from || !r.to || !r.interest)) {
      toast({ title: "All range fields are required", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const { data: category } = await axios.post("/api/loan-categories", {
        name: categoryName.trim().toUpperCase(),
      });

      await Promise.all(
        ranges.map((r) =>
          axios.post("/api/category-ranges", {
            categoryId: category.id,
            fromDays: parseInt(r.from),
            toDays: parseInt(r.to),
            interestRate: r.interest.toString(),
          })
        )
      );

      toast({ title: "Category created successfully ✅" });
      setCategoryName("");
      setRanges([{ from: "", to: "", interest: "" }]);
      fetchCategories();
    } catch (error: any) {
      console.error("Create category error:", error);
      toast({
        title: "Failed to create category",
        description: error.response?.data?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
  try {
    await axios.delete(`/api/loan-categories/${id}`);
    toast({ title: "Category deleted ✅" });
    fetchCategories();
  } catch (err: any) {
    console.error("Delete category error", err);

    const message =
      err.response?.data?.message || "Failed to delete category";

    toast({
      title: "Delete Failed",
      description: message,
      variant: "destructive",
    });
  }
};

  return (
    <div className="space-y-10">
      <GstConfigurationCard/>
      {/* CREATE SECTION */}
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>Create New Category</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <Input
            placeholder="Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />

          <div className="space-y-4">
            <p className="font-medium text-gray-700">Interest Ranges</p>
            {ranges.map((range, index) => (
              <div key={index} className="grid grid-cols-3 md:grid-cols-4 gap-4 items-center">
                <Input
                  type="number"
                  placeholder="From (days)"
                  value={range.from}
                  onChange={(e) => handleRangeChange(index, "from", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="To (days)"
                  value={range.to}
                  onChange={(e) => handleRangeChange(index, "to", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Interest %"
                  value={range.interest}
                  onChange={(e) => handleRangeChange(index, "interest", e.target.value)}
                />
                <Button
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => handleRemoveRange(index)}
                >
                  ✖
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={handleAddRange}>
              ➕ Add Range
            </Button>
          </div>

          <div className="pt-4">
            <Button className="w-full" onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "💾 Create Category"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LIST SECTION */}
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>Existing Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.length === 0 ? (
            <p className="text-gray-600">No categories found.</p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between border p-2 rounded-lg"
              >
                <span className="font-medium">{cat.name}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
