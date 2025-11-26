import { Word } from './word.js'

export class WordList {
  constructor() {
    this.words = [];
    this.onChange = () => null;
  }

  addWord(word, description) {
    this.words.push(new Word(word, description));
    this.onChange();
  }

  removeWord(word) {
    this.words = this.words.filter((w) => w.word !== word);
    this.onChange();
  }

  toJSON() {
    return this.words.map((w) => w.toJSON());
  }
}