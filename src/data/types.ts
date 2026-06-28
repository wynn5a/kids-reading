export type Token = { char: string; pinyin: string };
export type Lesson = {
  id: number;
  number: string;
  title: string;
  author?: string;
  lines: Token[][];
};
