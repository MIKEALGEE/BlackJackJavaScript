const RequestHelper = require('../helpers/request_helper.js');
const PubSub = require("../helpers/pub_sub.js");

const Game = function () {
  this.newDeckUrl = 'https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=6';
  this.requestDeck = new RequestHelper(this.newDeckUrl);
  this.roundObject = {};

}

Game.prototype.bindEvents = function () {
  const playAgainButton = document.querySelector("#play-again-button");
  playAgainButton.addEventListener("click", () => {
    this.dealCards(this.deckId);
  });

  PubSub.subscribe("ResultView:hit-button-click", () => {
    this.drawOneCard(this.roundObject.playerCards, `player`)
  });

  PubSub.subscribe("ResultView:stick-button-click", () => {
    this.renderDealerAction(this.roundObject.dealerCards)
  });
};

Game.prototype.getShuffledDeck = function () {
  this.requestDeck.get()
    .then((shuffledDeck) => {
      this.newCardsUrl = `https://deckofcardsapi.com/api/deck/${ shuffledDeck.deck_id }/draw/?count=2`;
      this.deckId = shuffledDeck.deck_id;
      return shuffledDeck.deck_id;
    })
    .then((deckId) => {
      this.dealCards(deckId);
    })
}

Game.prototype.dealCards = function (deckId) {
  this.requestCards = new RequestHelper(this.newCardsUrl);
  this.requestCards.get()
    .then((drawnCards) => {
      this.convert(drawnCards.cards)
      this.roundObject.playerCards = drawnCards.cards;
      PubSub.publish("Game:player-cards-ready", this.roundObject.playerCards);
    })
    .then(() => {
      this.requestCards.get()
        .then((drawnCards) => {
          this.convert(drawnCards.cards)
          this.roundObject.dealerCards = drawnCards.cards;
          PubSub.publish("Game:dealer-cards-ready", this.roundObject.dealerCards);
          this.blackJackChecker(this.roundObject);
        });
    })
};

Game.prototype.drawOneCard = function (array, actor) {
  this.drawOneUrl = `https://deckofcardsapi.com/api/deck/${ this.deckId }/draw/?count=1`;
  this.requestOneCard = new RequestHelper(this.drawOneUrl);
  this.requestOneCard.get()
    .then((cardObject) => {
      this.convert(cardObject.cards);
      array.push(cardObject.cards[0]);
      PubSub.publish(`Game:${ actor }-cards-ready`, array);
      this.bustChecker(this.roundObject);
      return array;
    })
    .then((array) => {
      if (actor == `dealer`) {
        this.renderDealerAction(array)
      }
    })
  // if actor is dealer, renderDealerAction
};

Game.prototype.renderDealerAction = function (array) {
  if (this.getHandTotal(array) <= 16) {
    this.drawOneCard(array, `dealer`)
    // this.drawOneUrl = `https://deckofcardsapi.com/api/deck/${ this.deckId }/draw/?count=1`;
    // this.requestOneCard = new RequestHelper(this.drawOneUrl);
    // this.requestOneCard.get()
    //   .then((cardObject) => {
    //     this.convert(cardObject.cards);
    //     array.push(cardObject.cards[0]);
    //     PubSub.publish(`Game:dealer-cards-ready`, array);
    //     this.bustChecker(this.roundObject);
    //     console.log("Finished Draw Card Function");
    //     return array;
    //   })
    //   .then((array) => {
    //     this.getResult(this.roundObject);
    //     console.log("GETTING RESULT in if statement");
    //   })
    };

    // .then((array) => {
    //   console.log("REACH 2ND CHECK");
    //   if (this.getHandTotal(array) <= 16) {
    //   this.drawOneCard(array, `dealer`)}
    // })};
  this.getResult(this.roundObject);
  // TODO - not waiting for the API req and therefor checking old total and looping infinitely
};

Game.prototype.convert = function (drawnCards) {
  drawnCards.forEach((cardObject) => {
    if ((cardObject.value === "JACK") || (cardObject.value === "QUEEN") || (cardObject.value === "KING")) {
      cardObject.value = "10";
    }
    else if (cardObject.value === "ACE") {
      cardObject.value = "11";
    }
  });
};

Game.prototype.getResult = function (roundObject) {
  const playerTotal = this.getHandTotal(roundObject.playerCards)
  const dealerTotal = this.getHandTotal(roundObject.dealerCards)

  whoWon = "";

  if (playerTotal > 21) {
    whoWon = "You went Bust!"
  }
  else if (dealerTotal > 21) {
    whoWon = "Dealer went Bust!"
  }
  else if (dealerTotal > playerTotal) {
    whoWon = "Dealer wins!"
  }
  else if (playerTotal > dealerTotal) {
    whoWon = "You win!";
  }
  else {
    whoWon = "It's a draw!"
  }

  PubSub.publish("Game:result-loaded", whoWon);
};

Game.prototype.getHandTotal = function (array) {
  total = 0;
  array.forEach((card) => {
    total += Number(card.value)
  });
  return total;
};

Game.prototype.blackJackChecker = function (roundObject) {
  const playerTotal = this.getHandTotal(roundObject.playerCards)
  const dealerTotal = this.getHandTotal(roundObject.dealerCards)
  if ((playerTotal == 21) || (dealerTotal == 21)) {
    this.getResult(roundObject);
  }
  else {
    this.renderChoice(roundObject);
  }
};

Game.prototype.renderChoice = function (roundObject) {
  PubSub.publish("Game:choice-loaded");
}

Game.prototype.bustChecker = function (roundObject) {
  if ((this.getHandTotal(roundObject.playerCards) > 21) || (this.getHandTotal(roundObject.dealerCards) > 21)) {
    this.getResult(roundObject);
  }
};


//method B
// are you > 21?
//if yes -> go to ace checker
//if no, go to method c

//ace checker:
//is there an ace?
//change value of ace
//proceed to method C

//method C
//render the hit/stick button
//add listeners
//do you want another hit?
//if no -> go to dealer logic to see who;s actually won....
//if yes, go to get card method, and return to top of logic chart

//dealer logic
//if dealer total <= 16 { draw another card}
//else proceed to total checker

//check who's hand is highest
//trigger result


module.exports = Game;
