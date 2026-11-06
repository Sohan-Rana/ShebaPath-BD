import { expect, test } from "@playwright/test";

test("homepage shows hero, categories and popular services", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("পাসপোর্ট & ভ্রমণ").or(page.getByText("পাসপোর্ট ও ভ্রমণ")).first()).toBeVisible();
  await expect(page.getByText("ই-পাসপোর্ট আবেদন").first()).toBeVisible();
});

test("search works in Bangla and English", async ({ page }) => {
  await page.goto("/services?q=passport");
  await expect(page.getByText("ই-পাসপোর্ট আবেদন")).toBeVisible();
  await page.goto("/services?q=" + encodeURIComponent("জন্মনিবন্ধন"));
  await expect(page.getByText("জন্মনিবন্ধন").first()).toBeVisible();
});

test("service detail shows sections and official link", async ({ page }) => {
  await page.goto("/services/machine-readable-passport");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("পাসপোর্ট");
  await expect(page.getByText("প্রয়োজনীয় কাগজপত্র")).toBeVisible();
  await expect(page.getByRole("link", { name: /অফিসিয়াল ওয়েবসাইটে আবেদন/ })).toHaveAttribute("href", /epassport/);
});

test("register, save service, add application", async ({ page }) => {
  const email = `e2e${Date.now()}@test.bd`;
  await page.goto("/register");
  await page.getByLabel("পূর্ণ নাম").fill("E2E User");
  await page.getByLabel("ইমেইল").fill(email);
  await page.getByLabel(/পাসওয়ার্ড/).fill("E2ePassword123");
  await page.getByRole("button", { name: "রেজিস্টার" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/services/machine-readable-passport");
  await page.getByRole("button", { name: "সংরক্ষণ করুন" }).click();
  await expect(page.getByRole("button", { name: "সংরক্ষিত" })).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("tab", { name: "আমার আবেদন" }).click();
  await page.getByRole("button", { name: "আবেদন যোগ করুন" }).click();
  await page.getByLabel("সেবার নাম").fill("e-Passport");
  await page.getByLabel("রেফারেন্স নম্বর").fill("REF-123");
  await page.getByRole("button", { name: "সংরক্ষণ", exact: true }).click();
  await expect(page.getByText("REF-123")).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/login/);
});

test("AI assistant answers from verified data with sources", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByLabel("আপনার প্রশ্ন").fill("What documents do I need for e-Passport Application?");
  await page.getByRole("button", { name: "পাঠান" }).click();
  await expect(page.getByText("যাচাইকৃত তথ্যের ভিত্তিতে")).toBeVisible({ timeout: 15_000 });
});
