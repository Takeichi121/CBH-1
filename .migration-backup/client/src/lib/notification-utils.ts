export function getNotificationUrl(type: string): string | null {
  switch (type) {
    case "manager_request":
    case "request_approved":
    case "request_rejected":
      return "/requests";
    case "roster_published":
      return "/roster";
    case "daily_report":
      return "/sales/daily";
    case "borrow_transaction":
      return "/borrow/transactions";
    case "version_update":
      return "/settings";
    default:
      return null;
  }
}
