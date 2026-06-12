export const dateOptions = {
  lunchPlace: [
    "KPlaza",
    "Sweet Keish",
    "Jollibee",
    "McDonalds",
    "Sushi Yo",
    "Yaki-Yaki",
  ],
  preGoingHomeActivity: [
    "Potato Corner",
    "Milk Tea",
    "Burger",
    "Donut",
    "Pizza",
  ],
} as const;

export type DateOptionKey = keyof typeof dateOptions;
