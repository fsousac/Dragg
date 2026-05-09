# Changelog

All notable changes to Dragg will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [0.1.0] - 2026-05-08

### Added

- Initial Dragg personal finance dashboard.
- Google OAuth authentication with Supabase Auth.
- Supabase Postgres schema for profiles, categories, payment methods, transactions, monthly budgets, and goals.
- Row Level Security for user-owned finance data.
- Default categories and payment methods created after user registration.
- Transaction management.
- Payment method management, including credit card closing and due-day support.
- Budget split chart.
- Expenses by category chart.
- Goals tab.
- Forecast/scheduled expense support.
- Regional currency preference for BRL, USD, and EUR.
- i18n support.
- Vitest test setup with coverage.
- Open-source contribution templates.
- Security documentation.
- CI pipeline for lint, tests with coverage, and build.

### Security

- Supabase RLS policies for user data isolation.
- SQL hardening guidance and security documentation.
- No service-role credential usage in client-rendered code.

### Notes

This is the first MVP release of Dragg.
