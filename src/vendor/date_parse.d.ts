interface DateParseResult {
  title: string;
  date: Date | null;
}

declare function jsParseDate(input: string): DateParseResult;

export { jsParseDate };
