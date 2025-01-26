// Get necessary elements from the DOM
const ingredientButtons = document.querySelectorAll('.ingredient-btn');
const burgerContent = document.getElementById('burger-content');
const totalPriceElement = document.getElementById('price');
const addToBasketBtn = document.getElementById('add-to-basket-btn');
const basketSection = document.getElementById('basket');
const checkoutBtn = document.getElementById('checkout-btn');
const shoppingBasket = document.getElementById('shopping-basket');
const basketItems = document.getElementById('basket-items');
const totalCostElement = document.getElementById('total-cost');

let totalPrice = 0;
let basketTotal = 0; // New variable to track the basket total
let basket = [];

// Function to update the total price display
function updateTotalPrice() {
  totalPriceElement.textContent = totalPrice.toFixed(2);
}

// Function to add an ingredient to the burger
function addIngredient(ingredient, price) {
  const ingredientEmoji = getIngredientEmoji(ingredient);
  const ingredientElement = document.createElement('span');
  ingredientElement.classList.add('ingredient');
  ingredientElement.textContent = ingredientEmoji;

  // Add ingredient emoji between the burger buns
  burgerContent.appendChild(ingredientElement);

  // Update total price
  totalPrice += price;
  updateTotalPrice();

  // Add the ingredient to the basket list (for later removal)
  basket.push({ ingredient, price, element: ingredientElement });
}

// Function to get ingredient emoji based on ingredient name
function getIngredientEmoji(ingredient) {
  const emojis = {
    tomato: '🍅',
    onion: '🧅',
    lettuce: '🥬',
    cheese: '🧀',
    patty: '🥩'
  };
  return emojis[ingredient] || '';
}

// Function to remove an ingredient
function removeIngredient(ingredientElement) {
  const index = basket.findIndex(item => item.element === ingredientElement);
  if (index !== -1) {
    const { price } = basket[index];
    basket.splice(index, 1); // Remove ingredient from basket
    totalPrice -= price; // Decrease total price
    updateTotalPrice();
    burgerContent.removeChild(ingredientElement); // Remove the ingredient emoji from the burger
  }
}

// Event listeners for adding ingredients
ingredientButtons.forEach(button => {
  button.addEventListener('click', () => {
    const ingredient = button.dataset.ingredient;
    const price = parseFloat(button.dataset.price);
    addIngredient(ingredient, price);
  });
});

// Event listener for removing an ingredient when clicked
burgerContent.addEventListener('click', event => {
  if (event.target.classList.contains('ingredient')) {
    removeIngredient(event.target);
  }
});

// Function to handle adding the burger to the basket
addToBasketBtn.addEventListener('click', () => {
  // Add the current total price to the basket total
  basketTotal += totalPrice;

  // Display only the total basket price
  basketItems.innerHTML = 'Your Burger is ready!';
  totalCostElement.textContent = `Total: $${basketTotal.toFixed(2)}`;
  shoppingBasket.style.display = 'block';
  basketSection.scrollIntoView();
});

// Function to handle checkout
checkoutBtn.addEventListener('click', () => {
  // Display the alert message before resetting
  alert("Enjoy your burger! 🍔");

  // Reset everything
  totalPrice = 0;
  basketTotal = 0; // Reset the basket total
  basket = [];
  burgerContent.innerHTML = ''; // Clear burger
  updateTotalPrice(); // Update price to 0

  // Reset the basket content (empty the basket items and reset the total cost)
  basketItems.innerText = 'No items yet!';
  totalCostElement.innerText = 'Total: $0.00';

  // Hide the shopping basket section after checkout
  shoppingBasket.style.display = 'none';
});
