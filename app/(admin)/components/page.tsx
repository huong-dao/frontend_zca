"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { HiPlus, HiTrash, HiArrowRight } from "react-icons/hi2";
import Badge from "@/components/ui/Badge";

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

      <section className="space-y-6">

        {/* STATUS */}
        <section className="space-y-4">
          <h2 className="font-semibold">Status</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="success">Active</Badge>
            <Badge variant="error">Failed</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="info">Draft</Badge>
            <Badge>Default</Badge>
          </div>
        </section>

        {/* TAG / LABEL */}
        <section className="space-y-4">
          <h2 className="font-semibold">Tag / Label</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge>Marketing</Badge>
            <Badge>Internal</Badge>
            <Badge>VIP</Badge>
            <Badge variant="info">New</Badge>
          </div>
        </section>

        {/* COUNTER */}
        <section className="space-y-4">
          <h2 className="font-semibold">Counter</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="info">12</Badge>
            <Badge variant="error">99+</Badge>
            <Badge variant="success">5</Badge>
          </div>
        </section>

        {/* REALTIME INDICATOR */}
        <section className="space-y-4">
          <h2 className="font-semibold">Realtime Indicator</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="success" dot>Online</Badge>
            <Badge variant="error" dot>Offline</Badge>
            <Badge variant="warning" dot>Idle</Badge>
          </div>
        </section>

        {/* ROLE */}
        <section className="space-y-4">
          <h2 className="font-semibold">Role</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="info">User</Badge>
            <Badge variant="warning">Moderator</Badge>
            <Badge variant="error">Admin</Badge>
          </div>
        </section>

        {/* API STATE */}
        <section className="space-y-4">
          <h2 className="font-semibold">API State</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="success" dot>Connected</Badge>
            <Badge variant="error" dot>Disconnected</Badge>
            <Badge variant="warning">Rate Limited</Badge>
          </div>
        </section>

        {/* CRM / TABLE */}
        <section className="space-y-4">
          <h2 className="font-semibold">CRM / Table Usage</h2>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <span className="w-32">Message</span>
              <Badge variant="success">Sent</Badge>
            </div>
          </div>
        </section>

      </section>
    </div>
  );
}