export function detectEnterpriseProvider(email) {
  if (!email) return null;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  // Add your real org domains here
  const enterpriseDomains = {
    "outlook.com": "microsoft",
    "hotmail.com": "microsoft",
    "live.com": "microsoft",
    "office365.com": "microsoft",
    // "yourcollege.edu": "microsoft",
    // "yourcompany.com": "microsoft",
  };

  return enterpriseDomains[domain] || null;
}