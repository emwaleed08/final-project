# Food Passport

**See the world, one plate at a time.** A landing page, then a scroll story in the style of The Pudding: guess first, then watch 50 signature dishes from 50 countries sort themselves into the answer and fly home on a world map.

## Run it
Open this folder in VS Code and choose **Open with Live Server** on `index.html`. Be online so the photos and map load.

## Files
```
index.html         page structure: the landing page and the story steps
css/style.css      all styling
js/main.js         loads the data with async/await and builds everything
data/dishes.json   50 dishes: country, dish, continent, capital coordinates,
                   main ingredient, cooking method, meat/fish/vegetarian,
                   description, and a Wikimedia Commons photo (43 of 50)
```

## How the story works
1. `loadDishes()` fetches `data/dishes.json` with async/await.
2. Each dish becomes a round photo "chip" on a stage that stays pinned while you scroll.
3. An `IntersectionObserver` notices which step is in the middle of the screen.
4. `arrange()` picks a layout for that step (scatter, grid, piles, or map) and GSAP moves every chip there.
5. The piles are built with `groupBy()`, which is just `forEach` and `sort` over the data, so every number shown comes from the dataset.

## Views and the class skill each uses
| View | What it shows | Skill |
|---|---|---|
| Landing | headline, real dish photos as polaroids, "What's inside" | DOM + GSAP |
| Guess 1 | dishes piled by main ingredient | array grouping + GSAP |
| Guess 2 | slider guess, then vegetarian dishes light up | DOM events + GSAP |
| Guess 3 | dishes piled by cooking method | array grouping + GSAP |
| Map step | every dish placed on its home country | simple map math + GSAP |

## Data
Dishes chosen from Wikipedia's "National dish" article. Many countries have several, so these are signature dishes rather than official ones. Photos from Wikimedia Commons via a Wikidata query; each card links to the photo's Commons page with its author and license.
