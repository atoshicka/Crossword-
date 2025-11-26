export class Word {
  constructor(word, description) {
    this.word = word;
    this.description = description;
  }

  toJSON() {
    return { word: this.word, description: this.description };
  }
}