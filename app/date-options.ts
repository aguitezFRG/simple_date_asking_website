export const dateOptions = {
  lunchPlace: [
    "McDonalds",
    "Kawa",
    "Dear Hotpot",
    "Ramen Kuroda",
    "Bonchon",
  ],
  preGoingHomeActivity: [
    "Potato Corner",
    "Coco",
    "KMart Shopping",
    "Burger King",
  ],
} as const;

export type DateOptionKey = keyof typeof dateOptions;
