"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { HiPlus, HiTrash, HiArrowRight } from "react-icons/hi2";

export default function ButtonDemoPage() {
  const [loading, setLoading] = useState(false);

  const handleLoading = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Button Demo</h1>

      {/* VARIANTS */}
      <section className="space-y-4">
        <h2 className="font-semibold">Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      {/* SIZES */}
      <section className="space-y-4">
        <h2 className="font-semibold">Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      {/* ICON BUTTON */}
      <section className="space-y-4">
        <h2 className="font-semibold">Icon Button</h2>
        <div className="flex gap-4">
          <Button variant="icon">
            <HiPlus />
          </Button>
          <Button variant="icon">
            <HiTrash />
          </Button>
          <Button variant="icon_ghost">
            <HiPlus />
            </Button>
        </div>
      </section>

      {/* WITH ICONS */}
      <section className="space-y-4">
        <h2 className="font-semibold">With Icons</h2>
        <div className="flex flex-wrap gap-4">
          <Button startIcon={<HiPlus />}>Add</Button>
          <Button endIcon={<HiArrowRight />}>Next</Button>
          <Button startIcon={<HiPlus />} endIcon={<HiArrowRight />}>
            Both Icons
          </Button>
        </div>
      </section>

      {/* LOADING */}
      <section className="space-y-4">
        <h2 className="font-semibold">Loading</h2>
        <div className="flex gap-4">
          <Button loading>Loading</Button>
          <Button onClick={handleLoading} loading={loading}>
            Click to Load
          </Button>
        </div>
      </section>

      {/* DISABLED */}
      <section className="space-y-4">
        <h2 className="font-semibold">Disabled</h2>
        <div className="flex gap-4">
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
        </div>
      </section>

      {/* FULL WIDTH */}
      <section className="space-y-4">
        <h2 className="font-semibold">Full Width</h2>
        <div className="space-y-3">
          <Button fullWidth>Full Width Button</Button>
          <Button variant="secondary" fullWidth>
            Full Width Secondary
          </Button>
        </div>
      </section>

      {/* MIXED */}
      <section className="space-y-4">
        <h2 className="font-semibold">Mixed Example</h2>
        <div className="flex flex-wrap gap-4">
          <Button
            variant="destructive"
            startIcon={<HiTrash />}
            loading={loading}
            onClick={handleLoading}
          >
            Delete
          </Button>

          <Button variant="outline" endIcon={<HiArrowRight />}>
            Continue
          </Button>
        </div>
      </section>
    </div>
  );
}