export type Page = {
  href: string;
  /**
   * Translation key used to look up the page name in messages.
   */
  key: string;
  pages?: Page[];
};
