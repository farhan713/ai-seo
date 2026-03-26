import type { BacklinkPriority } from "@prisma/client";

export type DefaultDirectory = {
  directoryName: string;
  directoryUrl: string;
  priority: BacklinkPriority;
};

/** Ten common local and directory listings for MVP checklist */
export const DEFAULT_BACKLINK_DIRECTORIES: DefaultDirectory[] = [
  {
    directoryName: "Google Business Profile",
    directoryUrl: "https://business.google.com/",
    priority: "HIGH",
  },
  {
    directoryName: "Bing Places for Business",
    directoryUrl: "https://www.bingplaces.com/",
    priority: "HIGH",
  },
  {
    directoryName: "Apple Maps (Maps Connect)",
    directoryUrl: "https://mapsconnect.apple.com/",
    priority: "HIGH",
  },
  {
    directoryName: "Yelp for Business",
    directoryUrl: "https://biz.yelp.com/",
    priority: "MEDIUM",
  },
  {
    directoryName: "Yellow Pages",
    directoryUrl: "https://www.yellowpages.com/",
    priority: "MEDIUM",
  },
  {
    directoryName: "Facebook Business",
    directoryUrl: "https://www.facebook.com/business",
    priority: "MEDIUM",
  },
  {
    directoryName: "LinkedIn Company Page",
    directoryUrl: "https://www.linkedin.com/company/setup/",
    priority: "MEDIUM",
  },
  {
    directoryName: "Better Business Bureau",
    directoryUrl: "https://www.bbb.org/",
    priority: "LOW",
  },
  {
    directoryName: "Angi (formerly Angie’s List)",
    directoryUrl: "https://www.angi.com/",
    priority: "LOW",
  },
  {
    directoryName: "Nextdoor Business",
    directoryUrl: "https://business.nextdoor.com/",
    priority: "LOW",
  },
];
