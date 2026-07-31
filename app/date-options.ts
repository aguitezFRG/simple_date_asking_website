export const dateOptions = {
  lunchPlace: [
    "McDonalds",
    "Kawa",
    "Dear Hotpot",
    "Ramen Kuroda",
    "MyLaksa",
    "Cafelandia",
  ],
  preGoingHomeActivity: [
    "Potato Corner",
    "KMart Shopping",
    "Tomoro Coffee",
    "Choco Avenue",
    "711",
    "McDonalds",
  ],
} as const;

export type DateOptionKey = keyof typeof dateOptions;
