// 如果上傳到CodePen有問題，把HTML<head></head>的部份刪除就會正常了

// 狀態機
const GAME_STATE = {
  FirstCardAwaits: "FirstCardAwaits",
  SecondCardAwaits: "SecondCardAwaits",
  CardsMatchFailed: "CardsMatchFailed",
  CardsMatched: "CardsMatched",
  GameFinished: "GameFinished",
};

// 撲克牌花色圖檔，因為屬於不會去改變的變數所以第一個字母大寫
const Symbols = [
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17989/__.png", // 黑桃
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17992/heart.png", // 愛心
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17991/diamonds.png", // 方塊
  "https://assets-lighthouse.alphacamp.co/uploads/image/file/17988/__.png", // 梅花
];

// MVC的View /////////////////////////////////////////////////////////////////////////////////////
const view = {
  // 渲染撲克牌
  getCardElement(index) {
    return `<div data-index='${index}' class="card back"></div>`;
  },

  // 渲染撲克牌數字與花色
  getCardContent(index) {
    const number = this.transformNumber((index % 13) + 1);
    const symbol = Symbols[Math.floor(index / 13)];

    return `
      <p>${number}</p>
      <img src="${symbol}" />
      <p>${number}</p>
      `;
  },

  // 把特殊數字轉成英文字母
  transformNumber(number) {
    switch (number) {
      case 1:
        return "A";
      case 11:
        return "J";
      case 12:
        return "Q";
      case 13:
        return "K";
      default:
        return number;
    }
  },

  // 選取DOM並更改HTML內容
  displayCards(indexes) {
    const rootElement = document.querySelector("#cards");
    rootElement.innerHTML = indexes
      .map((index) => this.getCardElement(index))
      .join("");
  },

  flipCards(...cards) {
    cards.map((card) => {
      if (card.classList.contains("back")) {
        card.classList.remove("back");
        card.innerHTML = this.getCardContent(Number(card.dataset.index));
        return;
      }

      // 若為正面則翻回背面，且清空內容因為牌背不會有數字與花色
      card.classList.add("back");
      card.innerHTML = null;
    });
  },

  // 配對成功的樣式變化
  pairCards(...cards) {
    cards.map((card) => {
      card.classList.add("paired");
    });
  },

  renderScore(score) {
    document.querySelector(".score").textContent = `Score: ${score}`;
  },

  renderTriedTimes(times) {
    document.querySelector(
      ".tried"
    ).textContent = `You've tried: ${times} times`;
  },

  // 加入卡片閃爍動畫
  appendWrongAnimation(...cards) {
    cards.map((card) => {
      card.classList.add("wrong"); // 加動畫就跟加class方式一樣
      card.addEventListener(
        // 若動畫結束就馬上把動畫移除，要不然class只能加一次會讓動畫無法在該牌重複出現
        "animationend",
        (e) => {
          card.classList.remove("wrong");
        },
        {
          once: true, // 代表這個eventlistener是一次性的，觸發完後立刻消失，對瀏覽器負擔較小
        }
      );
    });
  },

  // 遊戲結束畫面
  showGameFinished() {
    const div = document.createElement("div");
    div.classList.add("completed");
    div.innerHTML = `
      <p>Complete!</p>
      <p>Score: ${model.score}</p>
      <p>You've tried: ${model.triedTimes} times</p>
    `;
    const header = document.querySelector("#header");
    header.before(div);
  },
};

// MVC的Model /////////////////////////////////////////////////////////////////////////////////////
const model = {
  revealedCards: [],

  // 看翻開的兩張牌是否相同
  isRevealedCardsMatched() {
    return (
      this.revealedCards[0].dataset.index % 13 ===
      this.revealedCards[1].dataset.index % 13
    );
  },

  score: 0,

  triedTimes: 0,
};

// MVC的Controller /////////////////////////////////////////////////////////////////////////////////////
const controller = {
  currentState: GAME_STATE.FirstCardAwaits,

  generateCards() {
    view.displayCards(utility.getRandomNumberArray(52));
  },

  // 依照遊戲狀態做不同行為
  dispatchCardAction(card) {
    if (!card.classList.contains("back")) {
      return;
    }

    switch (this.currentState) {
      case GAME_STATE.FirstCardAwaits:
        view.flipCards(card);
        model.revealedCards.push(card);
        this.currentState = GAME_STATE.SecondCardAwaits;
        break;

      case GAME_STATE.SecondCardAwaits:
        view.renderTriedTimes(++model.triedTimes);
        view.flipCards(card);
        model.revealedCards.push(card);

        if (model.isRevealedCardsMatched()) {
          // 配對正確，要記得加分
          view.renderScore((model.score += 10));
          this.currentState = GAME_STATE.CardsMatched;
          view.pairCards(...model.revealedCards);
          model.revealedCards = [];

          // 遊戲結束
          if (model.score === 260) {
            this.currentState = GAME_STATE.GameFinished;
            view.showGameFinished();
            return;
          }

          this.currentState = GAME_STATE.FirstCardAwaits;
        } else {
          // 配對失敗
          this.currentState = GAME_STATE.CardsMatchFailed;

          // 呼叫邊框閃爍的效果
          view.appendWrongAnimation(...model.revealedCards);

          // 延遲一秒，讓玩家有時間記牌
          // 這邊要注意，第一個參數本來就是放函式，後面不用加()，若加了會變成放該函式的結果而非函式本身
          setTimeout(this.resetCards, 1000);
        }
        break;
    }
  },

  resetCards() {
    view.flipCards(...model.revealedCards);
    model.revealedCards = [];
    // 下面這邊要小心，如果寫this會有問題，因為setTimeout呼叫它時這邊的this會變成是指setTimeout
    controller.currentState = GAME_STATE.FirstCardAwaits;
  },
};

// 不屬於 MVC 的外掛區 /////////////////////////////////////////////
const utility = {
  getRandomNumberArray(count) {
    const number = Array.from(Array(count).keys());
    for (let index = number.length - 1; index > 0; index--) {
      let randomIndex = Math.floor(Math.random() * (index + 1));
      [number[index], number[randomIndex]] = [
        number[randomIndex],
        number[index],
      ];
    }
    return number;
  },
};

controller.generateCards();

// 翻牌
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", (event) => {
    controller.dispatchCardAction(card);
  });
});

// 說明區
/*

遊戲流程思考
- 發牌或洗牌，讓牌組隨機分佈
- 所有牌面皆朝下
- 玩家點一張牌，牌翻正面，再點另一張，牌亦翻正面
- 若數字相同則兩張牌面皆維持朝上且分數加10分、若不同則皆朝下且分數不變
- 只要按了兩張牌，次數皆加1
- 正面牌按了不會有反應
- 當分數到達260分，遊戲結束
*/
