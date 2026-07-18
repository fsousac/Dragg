export function createTestUser() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  return {
    email: `e2e-${unique}@example.com`,
    password: "Secure1!x",
    firstName: "Dragg",
    lastName: `E2E ${unique}`,
  };
}
