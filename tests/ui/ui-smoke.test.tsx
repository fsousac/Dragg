import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

describe("ui primitives", () => {
  it("merges tailwind classes predictably", () => {
    expect(cn("px-2", false, "px-4", ["text-sm"])).toContain("px-4");
    expect(cn("px-2", false, "px-4", ["text-sm"])).not.toContain("px-2");
  });

  it("generates button and badge variants", () => {
    expect(buttonVariants({ size: "lg", variant: "destructive" })).toContain(
      "bg-destructive",
    );
    expect(badgeVariants({ variant: "outline" })).toContain("text-foreground");
  });

  it("renders common primitives to markup", () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>
            <Button size="sm" variant="outline">
              Save
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Label htmlFor="field">Field</Label>
          <Input id="field" defaultValue="value" />
          <Textarea defaultValue="long value" />
          <Progress value={40} />
          <Progress />
          <Separator />
          <Badge variant="secondary">Badge</Badge>
          <Badge asChild variant="outline">
            <a href="/badge">Badge link</a>
          </Badge>
          <Kbd>⌘K</Kbd>
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
          <Skeleton />
          <Spinner />
        </CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(html).toContain("Title");
    expect(html).toContain("Description");
    expect(html).toContain("Save");
    expect(html).toContain("Badge");
    expect(html).toContain("Footer");
  });

  it("renders button asChild and alternate variants", () => {
    const html = renderToStaticMarkup(
      <>
        <Button asChild variant="link" size="icon">
          <a href="/settings">Settings</a>
        </Button>
        <Button variant="ghost" size="icon-sm">
          G
        </Button>
        <Button variant="secondary" size="icon-lg">
          S
        </Button>
      </>,
    );

    expect(html).toContain("Settings");
    expect(html).toContain("href");
  });

  it("renders select primitives and helper controls", () => {
    const html = renderToStaticMarkup(
      <>
        <Select value="cash">
          <SelectTrigger size="sm" className="custom-trigger">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent position="item-aligned" className="custom-content">
            <SelectGroup>
              <SelectLabel>Payment methods</SelectLabel>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectSeparator />
              <SelectItem value="card">Card</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </>,
    );

    expect(html).toContain("custom-trigger");
  });

  it("executes select wrapper components directly", () => {
    expect(Select({ value: "cash" }).props["data-slot"]).toBe("select");
    expect(SelectGroup({ children: "Group" }).props["data-slot"]).toBe(
      "select-group",
    );
    expect(SelectValue({ placeholder: "Pick" }).props["data-slot"]).toBe(
      "select-value",
    );
    expect(SelectTrigger({ children: "Trigger" }).props["data-slot"]).toBe(
      "select-trigger",
    );
    expect(SelectContent({ children: "Content" }).props.children).toBeTruthy();
    expect(SelectLabel({ children: "Label" }).props["data-slot"]).toBe(
      "select-label",
    );
    expect(SelectItem({ value: "cash", children: "Cash" }).props["data-slot"]).toBe(
      "select-item",
    );
    expect(SelectSeparator({}).props["data-slot"]).toBe("select-separator");
    expect(SelectScrollUpButton({}).props["data-slot"]).toBe(
      "select-scroll-up-button",
    );
    expect(SelectScrollDownButton({}).props["data-slot"]).toBe(
      "select-scroll-down-button",
    );
  });
});
