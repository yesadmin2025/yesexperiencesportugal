// Auto-generated from Viator on 2026-06-15 — DO NOT edit by hand.
// Source: each tour's public Viator product page (see viatorUrl).
// Used by tours/$tourId page to show real photos, real reviews, real price.

export type ViatorReview = {
  title: string;
  author: string;
  date: string | null;
  text: string;
};

export type ViatorStop = {
  name: string;
  desc: string;
  passBy?: boolean;
};

/**
 * Real per-person price in EUR by party size (the Viator "tier" structure
 * — most Viator private tours quote a different per-pax rate for 1, 2, 3…
 * up to 8+ travellers, with 8+ as the lowest "from" anchor).
 *
 * Keys are integer group sizes (1..8). Key `8` MUST be present and equals
 * the same EUR figure as `signatureTours[tour].priceFrom` (the 8+ anchor).
 * Smaller groups carry a higher per-pax price.
 *
 * Leave undefined for tours we have NOT yet ingested real tier data for —
 * the UI falls back to the "from €X / guest" anchor instead of inventing
 * numbers.
 */
export type PriceTiersEUR = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, number>>;

export type ViatorMeta = {
  viatorUrl: string;
  priceFromUSD: number | null;
  /** Raw Viator review count. */
  viatorReviewCount: number;
  /** Display review count = viatorReviewCount + 20 (private referrals). */
  reviewCount: number;
  /** Always 5 per brand standard. */
  rating: 5;
  recommendedPct: number | null;
  stops: ViatorStop[];
  topReviews: ViatorReview[];
  /** Viator gallery URLs (CDN, 674x446). First item is the recommended cover. */
  gallery: string[];
  overview: string | null;
  included: string[];
  /**
   * OPTIONAL — real per-pax EUR price by group size, scraped from the
   * Viator product page. Populate per tour as data is verified. When
   * absent, the UI shows the `priceFrom` (8+) anchor with a clear "from"
   * label. Never invent values.
   */
  priceTiersEUR?: PriceTiersEUR;
};

export const VIATOR_META: Record<string, ViatorMeta> = {
  "arrabida-wine-allinclusive": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Wine-Tour-with-Food-and-Wine-Tasting-in-Southern-Lisbon/d538-349639P3",
    priceFromUSD: 164.38,
    viatorReviewCount: 470,
    reviewCount: 490,
    rating: 5,
    recommendedPct: 97,
    overview: "Escape Lisbon on a private, all-inclusive journey through the Arrabida and Setubal wine regions, where picturesque bays and rolling vineyards set the scene for an indulgent day of wine, food, and culture. Visit handpicked wineries for tastings of award-winning varietals—with a delicious Portuguese lunch in between tastings. Along the way, explore the bustling Livramento Market to sample local cheese, fresh oysters, and traditional pastries. Plus, witness centuries-old craftsmanship in action at a traditional Portuguese tile factory.",
    included: [
      "Visit 2 or 3 wineries (depending on the experience you choose)",
      "Alcoholic Beverages",
      "Snacks",
      "Lunch",
      "Private transportation",
      "Be accompanied by a local certified guide, ensuring a personalized and authentic experience",
      "Visit to Livramento Market and Tile Factory and Arrabida Natural Park",
      "Enjoy an optional stop at Christ the King or Sesimbra Castle, depending on your pace and preferences",
    ],
    stops: [
      { name: "Mercado do Livramento", desc: "Experience the vibrant Mercado do Livramento in Setúbal, hailed as one of the Best Fresh Markets in the World by USA Today. Delight your senses as you explore over 145 years of local culinary tradition, from freshly harvested vegetables and fruits to an array of exquisite freshly caught fish and seafood, including the renowned local delicacy: fresh oysters. Immerse yoursel …" },
      { name: "Parque Natural da Arrabida", desc: "Embark on an unforgettable adventure through Arrábida, home to some of Europe's most breathtaking beaches. Prepare to be mesmerized as we journey across the majestic mountains, offering unparalleled panoramic views of the stunning Arrábida coastline. Enjoy the natural beauty of crystal-clear waters, golden sands, and rugged cliffs, all waiting to be discovered. Get r …" },
      { name: "Azulejos de Azeitao", desc: "Step into a world of timeless beauty at our Traditional Tiles Factory and guided tour. Experience the magic of centuries-old craftsmanship as you witness skilled artisans handcrafting each tile with unparalleled precision and passion. Immerse yourself in the rich history and artistry behind this cherished tradition, and take home more than just memories with a unique, handcraft …" },
      { name: "House & Museum José Maria Da Fonseca", desc: "Step into the heart of Portuguese winemaking history at our esteemed winery, proudly crafting exquisite wines since 1834 and passed down through seven generations of family tradition. Join us for an enlightening winery tour where you'll uncover the secrets behind their renowned craftsmanship. Then, indulge in a tasting experience, savoring the distinctive flavors that have m …" },
      { name: "Azeitao", desc: "Lunch at a local restaurant and free time at the picturesque wine village of Azeitão." },
      { name: "Farm Catralvos", desc: "Enjoy the timeless charm of winemaking at Quinta de Catralvos, a quintessential traditional winery stop on our itinerary. Wander through picturesque vineyards and witness the intricate wine production process, from labeling to bottling, as knowledgeable guides unveil the artistry behind each bottle. Indulge in a tasting experience unlike any other, sampling at least five  …" },
      { name: "Quinta do Piloto", desc: "Embark on a sensory journey at Quinta do Piloto Winery, a stop on our itinerary where tradition meets innovation. Dive into the world of winemaking with an immersive winery tour led by passionate experts, as they unveil the meticulous process behind crafting our exceptional wines. Explore our vineyards and production facilities, gaining insight into the artistry and  …" },
      { name: "Adega Coop. de Palmela, C.R.L.", desc: "Discover the essence of winemaking at Adega de Palmela, an optional stop on our itinerary showcasing the finest Portuguese wines. Immerse on a winery tour, where you'll journey through the heart of historic vineyards and production facilities, gaining firsthand insight into time-honored techniques and commitment to quality. Indulge your palate with a carefully curated tasting …" },
      { name: "Bacalhoa Vinhos de Portugal", desc: "Experience the captivating blend of wine and art at Quinta da Bacalhôa, one of the winery options on our itinerary. Step into a world where tradition meets innovation as you embark on a modern winery tour unlike any other. Explore not only the secrets of winemaking but also immerse yourself in a vibrant art exposition, showcasing a fusion of culture and creativity. Delight …" },
      { name: "Castelo de Sesimbra", desc: "Step back in time in the rich history of Portugal at Castelo de Sesimbra, the last medieval castle that is still standing by the sea. Perched majestically atop a rugged hill overlooking the charming town of Sesimbra, this medieval castle offers panoramic views of the Atlantic Ocean and the surrounding countryside. Explore the ancient walls and towers of this well-preserved fo …" },
      { name: "Acesso Ponte 25 de Abril", desc: "For traveleres coming from Lisbon. The Portuguese Golden Gate, overlooking Lisbon and Tagus River.", passBy: true },
      { name: "Ponte Vasco da Gama", desc: "For travelers coming from Lisbon. Built in 1998, is the second biggest Bridge in Europe, 17 kms long crossing the Tagus River. 11", passBy: true },
      { name: "Santuario Nacional de Cristo Rei", desc: "Experience awe-inspiring views and spiritual significance at Cristo Rei, a monumental stop for travelers coming from Lisbon. Situated on the opposite bank of the Tagus River, Cristo Rei stands tall as a symbol of faith and unity, reminiscent of the iconic Cristo Redentor in Rio de Janeiro, Brazil. Marvel at the breathtaking panoramic vistas of Lisbon and the river below as you  …" },
    ],
    topReviews: [
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/db/dd/b6.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/36/c6/89.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/2b/b4/5a/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/15/30/73/04.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/36/c6/7e.jpg",
    ],
    // Source: supplier.viator.com — All-Inclusive Experience (TG7), May 20 2026 – Nov 1 2026.
    // Per-pax EUR by group size: 2→€279, 3-4→€249, 5-7→€229, 8-15→€209. Min 2 pax.
    priceTiersEUR: { 2: 279, 3: 249, 4: 249, 5: 229, 6: 229, 7: 229, 8: 209 },
  },
  "wild-beaches-picnic": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Wild-Beaches-and-Picnic-Experience/d538-349639P1",
    priceFromUSD: 188.03,
    viatorReviewCount: 51,
    reviewCount: 71,
    rating: 5,
    recommendedPct: 98,
    overview: "Skip the hassle of research and route planning and embark on a full-day, private adventure through Arrabida Natural Park and Sesimbra from Lisbon. Experience rugged landscapes, serene beaches, and local culture off the beaten path. Discover the historic fishing village of Sesimbra and its grand castle, enjoy panoramic views from Cabo Espichel, visit the Livramento Market in Setubal, and much more.",
    included: [
      "Private transportation",
      "Air-conditioned vehicle",
      "Private Picnic with local cheeses, bread, smoked meats, pastries, fruit, wine, juice and water",
      "Bottled water",
      "All Fees and Taxes",
      "Local certified tour guide",
      "Private pick-up and drop-off in Lisbon, Setúbal, Almada and Sesimbra",
    ],
    stops: [
      { name: "Mercado do Livramento", desc: "One of the best markets in world, where you can choose some delights for your picnic. Closed on Mondays." },
      { name: "Parque Natural da Arrabida", desc: "Arrábida Mountain on Portugal's Setúbal Peninsula is a stunning natural gem, boasting rugged cliffs, lush forests, and golden beaches lapped by azure waters. Its striking geological formations create an enchanting coastline, while secluded coves offer picturesque beaches like Praia da Figueirinha and Praia dos Galapinhos. Adventure seekers can enjoy hiking, rock climb …" },
      { name: "Portinho da Arrabida", desc: "Portinho da Arrábida is a picturesque bay located in the Arrábida Natural Park on the coast of Portugal, near Setúbal. Known for its stunning natural beauty, the area features clear turquoise waters, white sandy beaches, and lush green hillsides. It is a popular spot for swimming, snorkeling, and hiking, offering visitors a tranquil escape amidst breathtaking scenery. The region  …" },
      { name: "Praia de Galapinhos", desc: "Experience paradise on Earth at Praia de Galapinhos in Arrábida. Nestled along the stunning coastline of Portugal, this hidden gem boasts crystal-clear turquoise waters, golden sands, and dramatic cliffs, offering a picture-perfect setting for relaxation and exploration. Discover secluded coves, soak up the sun, and immerse yourself in the pristine natural beauty of one of Euro …" },
      { name: "Lapa de Santa Margarida", desc: "Lapa de Santa Margarida in Arrábida is a cave located in the Arrábida Natural Park near Setúbal, Portugal. It is known for its stunning limestone formations, including stalactites and stalagmites, as well as its underground lake. The cave offers visitors a unique opportunity to explore its geological wonders and learn about the region's natural history. It's a popular destination f …" },
      { name: "Sesimbra", desc: "Sesimbra is a charming coastal town located in the Setúbal District of Portugal. Nestled between the Arrábida Natural Park and the Atlantic Ocean, Sesimbra is renowned for its beautiful beaches, clear waters, and picturesque landscapes. The town's rich history is reflected in its historic center, with its narrow streets, colorful buildings, and traditional Portuguese architecture …" },
      { name: "Cabo Espichel", desc: "We can explore Cabo Espichel or Sesimbra Castle. Cabo Espichel, or Espichel Cape, is a stunning promontory located on the western coast of Portugal, near the town of Sesimbra. This rugged headland is renowned for its dramatic cliffs that tower above the Atlantic Ocean, offering breathtaking panoramic views of the sea and surrounding coastline. Atop the cape sits the …" },
      { name: "Praia das Bicas", desc: "Praia das bicas is another beautiful and wild beach in Sesimbra. You can have your picnic here." },
      { name: "Praia do Meco", desc: "Admire the Praia do Meco we can enjoy our picnic here." },
      { name: "Praia de Foz", desc: "You can decide to do your picnic on any of the beaches on the itinerary. We will pass by all of they so you can enjoy the views", passBy: true },
      { name: "Praia da Lagoa de Albufeira", desc: "We can also visit Praia da Lagoa de Albufeira and observe the birds and the nature around it. You can have your picnic here. 10", passBy: true },
      { name: "Castelo de Sesimbra", desc: "Sesimbra Castle, perched atop a hill overlooking the charming coastal town of Sesimbra in Portugal, is a historic fortress dating back to the Moorish period. This medieval stronghold offers panoramic views of the Atlantic Ocean and the surrounding landscape, making it a popular destination for visitors seeking both cultural enrichment and scenic beauty. The castle's  …" },
      { name: "Cristo Rei", desc: "Cristo Rei, or Christ the King, is a towering statue of Jesus Christ located in Almada, Portugal, overlooking the city of Lisbon across the Tagus River. Inspired by the Christ the Redeemer statue in Rio de Janeiro, Brazil, Cristo Rei stands at around 110 meters tall, including its pedestal. The monument was inaugurated in 1959 and has since become an iconic symbol of faith a …", passBy: true },
      { name: "Ponte 25 de Abril", desc: "The 25th of April Bridge, also known as Ponte 25 de Abril in Portuguese, is a suspension bridge spanning the Tagus River in Lisbon, Portugal. Completed in 1966, the bridge was originally named the Salazar Bridge but was later renamed to commemorate the Carnation Revolution of April 25, 1974. With a total length of over 2.2 kilometers, it connects the city of Lisbon to t …", passBy: true },
    ],
    topReviews: [
      { title: "Great trip outside of Lisbon city", author: "Joanna_R", date: "Jun 2024", text: "Our tour guide Nidia made this trip exceptional! She went above and beyond to tailor the experience to our preferences and was the perfect mix of personable and professional. Wonderful stops, scenery and the perfect place for a beach picnic!" },
      { title: "A day outside of Lisbon", author: "Ann_S", date: "Jun 2024", text: "The entire day was wonderful. We especially enjoyed the amazing sea views, And the visits to the food market to choose our picnic and the visit to the small tile factory." },
      { title: "Girls trip", author: "Kelly_B", date: "Aug 2023", text: "Nice scenic views from the mountain. It was fun strolling around Sesimbra. Nuno was a personable guide. He was very polite and informative. We had a great time at the lagoon!" },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/0f/ec/66/f5.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/0f/35/b9/0f.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/0f/35/b9/0c.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/0e/c0/cd/ea.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/78/ec/e4.jpg",
    ],
  },
  "arrabida-boat": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Full-Day-Arrabida-and-Sesimbra-with-Boat-Tour-from-Lisbon/d538-349639P12",
    priceFromUSD: 176.21,
    viatorReviewCount: 2,
    reviewCount: 22,
    rating: 5,
    recommendedPct: null,
    overview: "Leave Lisbon behind and explore the stunning beauty of southern Lisbon on this unforgettable full day private tour. Begin your day at the vibrant Livramento Market in Setúbal, one of the top fresh markets in the world. Then, wind through the dramatic landscapes of Arrábida Natural Park, where cliffs, turquoise waters, and wild beaches set the stage for adventure.\n\nIncluded in your tour is a scenic boat ride along the Arrábida coastline. At checkout, choose your preferred experience—dolphin watching, snorkeling, kayaking, or a boat ride with an included lunch. No matter the option, you’ll explore hidden beaches, caves, and breathtaking ocean views.\n\nLater, visit the charming fishing village of Sesimbra, step inside the historic Sesimbra Castle, and take in the sweeping views from Cape Espichel. With a private guide and flexible options, this is a day crafted just for you.",
    included: [
      "Private transportation",
      "Boat Tour (3 different options)",
      "Private local tour guide",
      "Lunch (when choosing the “Arrabida Discovery Boat Tour with Lunch”)",
      "Private pick up and drop off anywhere in Lisbon, Setúbal, Sesimbra and Almada.",
      "Bottled water",
      "Air-conditioned vehicle",
      "Lunch",
      "Personal expenses",
    ],
    stops: [
      { name: "Mercado do Livramento", desc: "One of the best fresh marketplaces in the world is located in Setúbal and is called Mercado do Livramento. The market, which is well-known for its lively ambiance and gorgeous azulejo tiles, provides a wide selection of fresh fish, regional specialties, and products. For those who enjoy good food, this place is a must-visit as it perfectly embodies Portuguese culinary traditions." },
      { name: "Parque Natural da Arrabida", desc: "Situated on the Portuguese coast, Arrábida Natural Park is a sanctuary of breathtaking scenery and abundant wildlife. Renowned for its verdant surroundings, undulating hills, and expansive vistas of the ocean, the park provides an ideal fusion of the natural world's splendor  …" },
      { name: "Lapa de Santa Margarida", desc: "Nestled within the Arrábida Natural Park lies a little-known jewel called Lapa de Santa Margarida. This magical sea cave provides guests a rare fusion of spiritual peace and natural beauty. It also has a small chapel devoted to Saint Mar …" },
      { name: "Castelo de Sesimbra", desc: "Sesimbra Castle is an ancient fortification perched on a mountaintop above the settlement with expansive views of the surrounding landscapes and sea. This well-preserved castle, which dates to the ninth century, has magnificent chapel, old wall …" },
      { name: "Sesimbra", desc: "Sesimbra is a charming fishing community on the Portuguese coast that is well-known for its exquisite beaches, mouthwatering seafood, and extensive maritime history. Sesimbra, which is sandwiched between the Atlantic Ocean and the Arrábida Natural Park, is known for its breathtak …" },
      { name: "Cabo Espichel", desc: "Famous for its breathtaking cliffs, expansive views of the ocean, and historical significance, Cabo Espichel is a spectacular coast close to Sesimbra. Both a quaint lighthouse and the well-known Sanctuary of Our Lady of the Cape are located on this p …" },
    ],
    topReviews: [
      { title: "Fantastic corporate team experience!", author: "Verified guest", date: "Mar 2026", text: "We booked this tour as a corporate team event while visiting Lisbon for a conference. Our group wanted something relaxed and authentic outside the city and this was perfect. The organization was excellent and everything ran smoothly for our group. The wineries were beautiful and the wine tastings were very well explained. The visit to Livramento Market was a highlight and lunch at a traditional Portuguese restaurant was fantastic. A great mix of wine, culture and scenery. Highly recommended for corporate groups visiting Lisbon." },
      { title: "Fantastic experience!", author: "Verified guest", date: "Jul 2024", text: "Our full-day tour was absolutely incredible! Exploring the stunning landscapes of Arrábida and Sesimbra was truly unforgettable, with exciting activities, including a scenic boat tour. The dolphin" },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/2b/14/5c/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/13/17/da/c4.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/13/17/15/10.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/13/17/14/fb.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/36/c6/7e.jpg",
    ],
    priceTiersEUR: { 2: 209, 3: 209, 4: 199, 5: 199, 6: 159, 7: 159, 8: 159 },
  },
  "tiles-workshop": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Full-Day-Golf-and-Wine-tasting-Private-Tour-in-South-Lisbon/d538-349639P4",
    priceFromUSD: 223.51,
    viatorReviewCount: 40,
    reviewCount: 60,
    rating: 5,
    recommendedPct: 95,
    overview: "Go beyond traditional sightseeing tours and immerse yourself in a true Portuguese tradition with this private tour just south of Lisbon. Learn about traditional “azulejos,” or tiles, and create your own as a souvenir to take home. Visit the seaside village of Sesimbra for stunning views of the Atlantic and the chance to have a fresh seafood lunch (own expense). Cap off the day at one of the area’s many vineyards for a guided wine tasting.",
    included: [
      "Private transportation",
      "Bottled water",
      "Certified tour guide",
      "Air-conditioned vehicle",
      "Alcoholic Beverages",
      "Tiles Making Workshop and Tile Shipping",
      "All entrances",
      "Cheese tasting",
      "Lunch",
    ],
    stops: [
      { name: "Mercado do Livramento", desc: "Experience the vibrant Mercado do Livramento in Setúbal, hailed as one of the Best Fresh Markets in the World by USA Today. Delight your senses as you explore over 145 years of local culinary tradition, from freshly harvested vegetables and fruits to an array of exquisite freshly caught fish and seafood, including the renowned local delicacy: fresh oysters. Immerse yours …" },
      { name: "Azulejos de Azeitao", desc: "Embark on a private tiles painting workshop where you'll delve into the artistry and heritage of tile making. Learn the time-honored techniques used since the 15th century passed down through generations as you craft your own masterpiece. Under the guidance of skilled artisans, unleash your creativity onto a blank canvas of ceramic tiles. Whether you're inspired by trad …" },
      { name: "Castelo de Sesimbra", desc: "Nestled atop a windswept hill, Sesimbra Castle dated back the 9th century and reigns over the charming coastal town with timeless grace. Within its ancient walls lies a hidden gem: the castle's church adorned with over 10,000 meticulously crafted Portuguese tiles dating back to the 16th century. Each tile tells a story of craftsmanship and tradition, creating a mesmerizin …" },
      { name: "Sesimbra", desc: "Experience the charm of Sesimbra, a hidden gem nestled at the foothills of the majestic Serra da Arrábida mountain range. Set against the backdrop of the Setúbal Bay, this picturesque municipality boasts a rich maritime heritage as a thriving fishing town.Discover the allure of Sesimbra as you wander through its historic streets, soaking in the vibrant culture and  …" },
      { name: "Farm Catralvos", desc: "Embark on a journey through the rich flavors and traditions of Portugal's winemaking heritage with a visit to Quinta de Catralvos, one of the premier winery options in the region. Join us for a guided tour through the vineyards and winery, where you'll uncover the secrets behind the production of our exquisite wines. From grape to glass, immerse yourself in the craftsma …" },
      { name: "Jose Maria de Fonseca", desc: "One of the Winery Options." },
      { name: "Bacalhoa Vinhos de Portugal", desc: "One of the Winery Options." },
      { name: "Santuario Nacional de Cristo Rei", desc: "Experience a moment of awe and inspiration at Cristo Rei, one of Portugal's most iconic landmarks. Towering majestically over the Tagus River, this magnificent statue of Christ offers panoramic views of Lisbon and beyond. Marvel at the intricate details of the statue as you ascend to its base, where stunning vistas await.Capture unforgettable memories against the backdro …" },
    ],
    topReviews: [
      { title: "Diego was friendly and", author: "Stephanie_C", date: "Feb 2026", text: "Diego was friendly and informative. He gave us wonderful suggestions and had lots of information about the area. Would recommend this tour!" },
      { title: "Enjoy the views and tile workshop!", author: "Sarah_J", date: "Aug 2025", text: "Wonderful, unique, and hands-on tour with a knowledgeable guide! We got to see sights and viewpoints we normally wouldn’t know to do on our own." },
      { title: "Of all the activities we", author: "iciclejam", date: "May 2025", text: "Of all the activities we booked in Lisbon, this was the one I was most excited about. It had all the makings of an incredible experience—until I got sick at our very first stop. Thankfully, our amazing tour guide João came to the rescue. He was super flexible and adjusted the itinerary to make things easier. If you’re thinking about booking this tour, definitely ask for João!" },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/32/d2/34/4a/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/36/c6/4c.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/51/e0/92.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/40/f3/07.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/10/3e/4e/50.jpg",
    ],
  },
  "azeitao-cheese": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Azeitao-Cheese-Private-Workshop-with-Wine-and-Food-Tasting/d538-349639P9",
    priceFromUSD: 176.21,
    viatorReviewCount: 2,
    reviewCount: 22,
    rating: 5,
    recommendedPct: null,
    priceTiersEUR: { 2: 239, 3: 189, 4: 189, 5: 149, 6: 149, 7: 149, 8: 119 },
    overview: "Make exploring beyond Lisbon city limits seamless—and enjoy multiple Portuguese culinary and cultural experiences in just one trip—on this private day tour. With your guide in the lead, visit the top-ranked Livramento Market in Setúbal, drive through Arrábida Natural Park, and make your very own cheese during a hands-on workshop in Azeitão. Finally, cap off your day out with a winery visit and tasting in the coastal village of Sesimbra.",
    included: [
      "Air-conditioned vehicle",
      "Private transportation",
      "All Fees and Taxes",
      "Private Azeitão cheese workshop",
      "Toasts, regional bread, fresh cheese, buttery Azeitão cheese, homemade jam/chutney and muscat wine",
      "Bottled water",
      "Private Pick Up and Drop Off anywhere in Lisbon, Almada, Setúbal and Sesimbra",
      "Winery entrances and tastings",
      "Lunch",
    ],
    stops: [
      { name: "Mercado do Livramento", desc: "One of the Best Fresh Markets in the Word according to “USA Today”. Livramento Market is a vibrant and bustling food market located in Setúbal, Portugal. With its colorful array of fresh fish, fruits, vegetables, seafood, and local delicacies, the market is a paradise for food enthusiasts and a feast for the senses. Visitors can immerse themselves in the lively atmosphere, i …" },
      { name: "Quinta Velha", desc: "This private workshop delves into a collective story, aiming to revive the tradition of knowledge transmission once held by elders like Ti Alfredo, the esteemed figure in Azeitão cheese making. It blends hands-on experience with an understanding of the natural relationship and interdependence between humans and the environment, passed down through centuries of traditio …" },
      { name: "Azeitao", desc: "Lunch and free time. Azeitão is a charming village located in the Setúbal district of Portugal. Known for its picturesque landscapes, historical landmarks, and delicious local cuisine, Azeitão offers a perfect blend of nature, culture, and gastronomy for visitors to explore and enjoy." },
      { name: "Farm Catralvos", desc: "Wine tour and 5 glasses of wine. Quinta de Catralvos is a renowned winery situated in Azeitão, Portugal. With its lush vineyards and state-of-the-art facilities, the winery produces a variety of high-quality wines, offering visitors a unique opportunity to indulge in wine tasting experiences and learn about the art of winemaking." },
      { name: "Castelo de Sesimbra", desc: "The last Medieval Castle that is still standing by the sea in Portugal. Sesimbra Castle is a historic fortress perched on a hilltop overlooking the town of Sesimbra in Portugal. With its commanding position and panoramic views of the coastline, the castle offers a glimpse into the region's rich history and serves as a popular tourist attraction. Visitors can explore the castle's anc …" },
      { name: "Santuario Nacional de Cristo Rei", desc: "Cristo Rei Sanctuary and Satue.", passBy: true },
      { name: "Ponte 25 de Abril", desc: "The Portuguese Golden Gate.", passBy: true },
    ],
    topReviews: [
      { title: "Amazing experience!", author: "Verified guest", date: "Jun 2024", text: "This was an amazing day. We saw incredible views, made our very own cheese, and learned everything there is to know about making wine in Portugal. What an unforgettable experience! Our guide, Ricardo, was extremely gracious and knowledgeable. He knew everything and everybody and really helped make the day special. Highly recommend this trip, especially to get out of the hustle and bustle of Lisbon." },
      { title: "A must try experience!", author: "Verified guest", date: "Mar 2024", text: "We an incredible time on a rainy day. Our tour guide, Nidiam, picked us up right from our hotel and made the day seamless. We started by visiting a gorgeous fresh market and taste local food and t" },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/7c/3c/18.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/7c/38/fe.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/7c/39/0d.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/40/f3/53.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/4c/45/62.jpg",
    ],
  },
  "sintra-cascais": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Sintra-and-Cascais-Hidden-Gems-Private-Tour-with-Wine-Tasting/d538-349639P10",
    priceFromUSD: 188.03,
    viatorReviewCount: 10,
    reviewCount: 30,
    rating: 5,
    recommendedPct: 100,
    priceTiersEUR: { 2: 215, 3: 215, 4: 199, 5: 199, 6: 199, 7: 189, 8: 189 },
    overview: "Discover the cultural gems and coastal charm of Sintra and Cascais on this customizable private tour from Lisbon. Travel in comfort with round-trip transport as you explore palaces, sip local wines, and enjoy scenic stops along Portugal’s scenic western coast. Perfect for travelers seeking a deeper, more flexible experience with expert local guidance.",
    included: [
      "Private transportation",
      "Air-conditioned vehicle",
      "One palace ticket and wine tour and tasting OR two palace tickets per person",
      "Bottled water",
      "Certified tour guide",
      "Private pick up and drop off anywhere in Lisbon, Setúbal, Almada and Sesimbra",
      "Local pastry",
      "Lunch",
    ],
    stops: [
      { name: "Sintra", desc: "Sintra, a UNESCO World Heritage Site, is a magical town nestled in the lush hills of Portugal. Known for its fairytale-like palaces, enchanting gardens, and mystical atmosphere, Sintra captivates visitors with its rich history and stunning architecture. From the colorful Pena Palace perched atop a hill to the mysterious Quinta da Regaleira with its secret passages and undergr …" },
      { name: "Sintra National Palace", desc: "One of the options on the itinerary: The Palácio Nacional de Sintra, or Sintra National Palace, is a captivating blend of Moorish and Gothic architecture nestled in the heart of Sintra, Portugal. With its iconic twin chimneys rising above the town, the palace is a striking sight against the lush landscape. Inside, visitors are transported to centuries past as they explore opulent roo …" },
      { name: "Park and National Palace of Pena", desc: "One of the options on the itinerary: Perched atop the verdant hills of Sintra, Portugal, Pena Palace is a vibrant and whimsical masterpiece of 19th-century Romantic architecture. Its colorful façade, adorned with intricate detailing and turrets, stands as a testament to the eclectic tastes of King Ferdinand II. Inside, visitors are transported to a bygone era, exploring opulent room …" },
      { name: "Azenhas do Mar", desc: "Lunch break and free time. Azenhas do Mar is a picturesque coastal village nestled along the cliffs of Portugal's Atlantic coast. Characterized by its charming whitewashed houses cascading down the cliffside, Azenhas do Mar offers breathtaking views of the deep blue sea below. Visitors can stroll along the coastal pathways, soak in the tranquil atmosphere, and dine at seasi …" },
      { name: "Quinta da Regaleira", desc: "One of the options on the itinerary: Quinta da Regaleira is a mesmerizing estate located in Sintra, Portugal, renowned for its enchanting gardens, mysterious tunnels, and Gothic architecture. Designed by Italian architect Luigi Manini, the estate is a captivating blend of Romantic, Gothic, and Renaissance styles. Visitors can wander through lush gardens adorned with la …" },
      { name: "Adega Regional de Colares", desc: "Adega de Colares is a historic winery nestled in the Colares region of Portugal, renowned for its unique vineyards planted in sandy soils near the Atlantic coast. Established in the late 19th century, Adega de Colares is known for its commitment to preserving traditional winemaking methods and producing distinctive wines that reflect the terroir of the region. Visitors to Adeg …" },
      { name: "Cascais", desc: "Cascais is a charming coastal town located just a short drive from Lisbon, Portugal. Known for its sandy beaches, picturesque harbor, and vibrant atmosphere, Cascais offers visitors a delightful blend of relaxation and adventure. Stroll along the charming cobblestone streets lined with colorful buildings, explore historic landmarks such as the Citadel Palace, or simply rela …" },
      { name: "Cabo Da Roca", desc: "Cabo da Roca is a rugged headland located on the western coast of Portugal, marking the westernmost point of mainland Europe. With its dramatic cliffs rising over the Atlantic Ocean, Cabo da Roca offers breathtaking panoramic views of the sea and surrounding coastline. Visitors can stand atop the cliff edge, feeling the power of the ocean winds, while admiring the rug …" },
    ],
    topReviews: [
      { title: "5 Star Service - Highly recommend!", author: "Verified guest", date: "Jul 2024", text: "⭐️⭐️⭐️⭐️⭐️ My mom and I had the absolute pleasure of touring Portugal with Miguel, and we couldn't have asked for a better guide! From the moment we met him, his warm personality and in" },
      { title: "Excellent Lisbon Tour", author: "Verified guest", date: "Jul 2024", text: "Nidia was very knowledgeable and a joy to spend a day with! She was also very flexible when we changed the plan on her mid-tour. We highly recommend her for tours in Lisbon and the surrounding area." },
      { title: "Great personalized tour of Lisbon area", author: "Verified guest", date: "Mar 2024", text: "Had amazing tour for the day. Lots of sites seen. Awesome pictures. The morning started with pastries and coffee—had queijadas de Sintra and travesseiros de Sintra. Delicious. We visited Sintra," },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/2b/06/27/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/74/20/11.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/74/20/2c.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/74/20/0f.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/74/20/10.jpg",
    ],
  },
  "troia-comporta": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Troia-and-Comporta-Tour-from-Lisbon-Ruins-Wine-and-Coast/d538-349639P18",
    priceFromUSD: 337.04,
    viatorReviewCount: 0,
    reviewCount: 20,
    rating: 5,
    recommendedPct: null,
    overview: "Escape into one of Portugal’s best-kept secrets — a discreet retreat favored by artists, still off the tourist routes, where everything feels untouched, blending history, wine, raw nature and exclusivity.\n\nStep back into the Roman era while experiencing the understated luxury of Troia Marina, where ancient ruins meet a wild Atlantic coastline in perfect contrast.\n\nA ferry used by locals — where dolphins are sometimes seen — leads into a world that feels almost undiscovered.\n\nDiscover Comporta — a place of secluded beach areas, often reached through private and local paths, where tradition still shapes everyday life. The Carrasqueira Palafitic Pier, one of Europe’s most unique wooden coastal structures, remains authentic and largely unknown.\n\nSavor local wines at Herdade da Comporta, reflecting the character of the region.\n\nA private, personalized, one-of-a-kind experience for travelers seeking something refined, authentic and exclusive — difficult to find without local knowledge.",
    included: [
      "Private transportation in air-conditioned vehicle",
      "Exclusive private experience with a local expert guide",
      "Ferry crossing across the Sado River (vehicle + passengers included)",
      "Guided visit to the Roman Ruins of Tróia (admission included)",
      "Wine experience at Herdade da Comporta (tasting included)",
      "Bottled water throughout the day",
      "Flexible itinerary with scenic stops and hidden gems along the coast",
      "Personalized recommendations for restaurants and local experiences",
      "Pickup and drop-off at your accommodation (Lisbon, Setúbal, Sesimbra or Almada)",
      "Lunch (we provide curated restaurant recommendations based on your preferences)",
    ],
    stops: [
      { name: "Baia de Setubal", desc: "Your journey begins with a scenic ferry crossing over the Sado River. This short but memorable ride already sets the tone for the day — transitioning from urban Lisbon to a more untouched and authentic Portugal. Keep your eyes open: dolphins are sometimes seen in these waters, adding a magical touch to the experience." },
      { name: "Roman Ruins of Troia", desc: "Step into over 2,000 years of history at one of Portugal’s most fascinating archaeological sites. Explore the remains of a Roman industrial complex, including ancient fish-salting tanks, baths and structures that once played a key role in the Roman Empire’s trade network. With your guide, you’ll understand not just what you’re seeing — but how life worked here centuries  …" },
      { name: "Marina de Troia", desc: "A brief stop to experience the contrast between ancient and modern Tróia. Here, sleek architecture meets natural surroundings, offering a glimpse into the area’s refined, understated luxury lifestyle. Perfect for photos and to take in the atmosphere." },
      { name: "Cais Palafitico do Porto da Carrasqueira", desc: "One of the most unique and photogenic places in Portugal. This traditional wooden fishing pier, built on stilts, is still used today by local fishermen and reflects a way of life that has remained unchanged for generations. It’s raw, authentic and completely different from anything you’ll find in typical tourist routes — a true hidden gem." },
      { name: "Comporta", desc: "Arrive in Comporta, a destination known for its relaxed sophistication and natural elegance. This is where celebrities and creatives escape the spotlight — drawn by its simplicity, privacy and connection to nature. Enjoy free time for lunch, with your guide recommending carefully selected local restaurants depending on your preferences — from fresh seafood to moder …" },
      { name: "Herdade Da Comporta", desc: "Visit one of the region’s most iconic wineries. Learn about the unique characteristics of Comporta wines, shaped by sandy soils and strong Atlantic influence — something very rare and distinctive. Enjoy a guided tasting of selected wines, where quality meets simplicity in a setting that reflects the region’s identity." },
      { name: "Comporta Beach", desc: "If conditions allow, stop at one of Comporta’s famous wild beaches. Endless sand, untouched dunes and the Atlantic breeze create a sense of space and freedom that is hard to find elsewhere in Europe." },
      { name: "Praia do Carvalhal", desc: "Another stunning coastal stop, known for its natural beauty and relaxed atmosphere. Perfect for photos, a short walk or simply taking in the scenery before heading back." },
    ],
    topReviews: [
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/32/f2/00/39/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/17/11/72/ea.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/2a/f5/51/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/17/11/72/ef.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/17/11/72/f1.jpg",
    ],
    // Source: supplier.viator.com — adult per-pax EUR: 2→€285, 3-4→€235, 5-7→€195, 8-12→€185. Min 2 pax.
    priceTiersEUR: { 2: 285, 3: 235, 4: 235, 5: 195, 6: 195, 7: 195, 8: 185 },
  },
  "evora-alentejo": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Full-Day-Wine-Tour-in-Setubal-Region-from-Lisbon/d538-349639P6",
    priceFromUSD: 258.99,
    viatorReviewCount: 31,
    reviewCount: 51,
    rating: 5,
    recommendedPct: 94,
    priceTiersEUR: { 2: 279, 3: 249, 4: 249, 5: 199, 6: 199, 7: 199, 8: 199 },
    overview: "Portugal’s Alentejo region is famous for its history and wine, but it can be difficult to access with public transportation. Skip the rental cars and book a private day trip from Lisbon to Evora, the capital of Alentejo. With your guide, visit local wineries for guided tastings and explore the highlights of the city, including the eerie Chapel of Bones.",
    included: [
      "Private pick-up and drop-off at your accommodation",
      "Dedicated local guide/host for a personalized and flexible experience",
      "All entrance fees included (including the iconic Chapel of Bones and Évora city visits)",
      "Guided visits and wine tastings at two carefully selected wineries",
      "Traditional tastings of local cheeses and cured meats",
      "Visit a traditional cork production site, showcasing Portugal as the world’s leading cork producer",
      "Bottled water throughout the day",
      "Lunch",
    ],
    stops: [
      { name: "Ponte 25 de Abril", desc: "For traveleres coming from Lisbon. The Portuguese Golden Gate, overlooking Lisbon and Tagus River. 1", passBy: true },
      { name: "Joao Portugal Ramos Wines", desc: "One of the Winery options on the itinerary. The winery embraces a modern approach to winemaking while respecting and honoring traditional winemaking techniques. João Portugal Ramos Winery is recognized for its diverse range of wines made from both indigenous Portuguese grape varieties and international varieties. Their portfolio includes white wines, such as  …" },
      { name: "Enoturismo Cartuxa", desc: "One of the options on the itinerary. The Adega Cartuxa got its name from the 16th century Mosteiro da Cartuxa (Cartuxa Monastery), which is situated right next to the winery and is part of the Eugénio de Almeida Foundation's patrimony. Excellence, quality, and individuality in a style of its own are the values recognized by consumers of the Cartuxa brand." },
      { name: "Pera-grave - Qta S. Jose De Peramanca", desc: "One of the Winery options on the itinerary. The winery has a long history, with its origins dating back to the 16th century. Today, it is considered one of the most prestigious wineries in Portugal. Quinta São José da Pêra Manca is particularly famous for its red wines, which are made from traditional regional grape varieties such as Aragonez, Trincadeira, and Alicante Bous …" },
      { name: "Ervideira", desc: "One of the Winery options on the itinerary. Ervideira is one of the secular wine companies in Portugal, dedicated to producing wine since 1880. It currently has the fourth and fifth generation of active producers. The estate has a total of 160 hectares of vineyards, distributed by family properties in Vidigueira and Reguengos. Since the beginning the mission was to create tr …" },
      { name: "Herdade do Esporao", desc: "One of the winery options. The Herdade do Esporão presents itself as an Estate steeped in history, producer of outstanding quality wines. The Esporão vines are located in the heart of Reguengos de Monsaraz, where wines are more balanced and seductive, simultaneously thriving and pleasant, luxuriant and with a good ageing potential. If the vines are the lung of the Herda …" },
      { name: "Chapel of Bones", desc: "The Chapel of Bones is a unique and intriguing attractions. It is a small chapel attached to the Church of St. Francis (Igreja de São Francisco) and is known for its macabre interior decoration. The chapel was built in the 16th century by Franciscan monks, with the purpose of conveying the message of life's transience and the importance of reflecting on mortality. The walls a …" },
      { name: "Evora", desc: "Évora is a UNESCO World Heritage site. The city dates back to Roman times and is full of ancient ruins, including a well-preserved Roman temple called the Temple of Diana. Évora is also famous for its well-preserved medieval walls, which enclose the historic center and offer stunning views of the city. The city's narrow streets are lined with beautiful whitewashed  …" },
      { name: "Templo Romano de Evora (Templo de Diana)", desc: "Also popularly known as Templo de Diana (Diana Temple), it was probably a place of worship to the Roman emperor of the time it was built. Located on the once Roman Forum of Evora and built in the beginning of the 1st century AD, this pagan monument of imposing proportions suffered different alterations during the Barbarian invasions and the Christian period. They a …" },
      { name: "Corticarte - Arte em Cortica", desc: "Visit a cork factory with a visit through the preparation process and explanations, from cork harvesting, quality selection and final products. There is a shop where you can get an authentic portuguese souvenir." },
    ],
    topReviews: [
      { title: "Great guide for Alentejo and Évora", author: "Monica_W", date: "Jun 2025", text: "Miguel was a wonderful guide/driver for the day. He is from the area and provided a lot of history which we enjoyed, especially his stories of his days at the university in Evora. We were able to see everything we wanted and additional sights based on his recommendation. Great tour!" },
      { title: "We had a wonderful day", author: "laurie_V", date: "Apr 2025", text: "We had a wonderful day with Helena. I can’t imagine a better guide her choice of winery and a small tavern for an authentic Portuguese lunch were exactly what we were looking for. I cannot recommend her highly enough." },
      { title: "Fantastic day with an excellent guide!", author: "marsim52", date: "Jun 2024", text: "We had a wonderful full day in the Alentejo with Ricardo. We enjoyed lovely wine tastings at family wineries, learned about local wine production, and had a super interesting visit to the cork factory. (Buy your cork products there rather than in Lisbon!) He adjusted the itinerary a bit to our interests and helped us to get a taste of the local food, drink, and culture. We would absolutely tour with Ricardo again." },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/2b/cb/8a/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/11/f9/67/80.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/78/ed/78.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/78/ed/76.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/11/82/30/56.jpg",
    ],
  },
  "tomar-coimbra": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/From-Lisbon-Private-Full-Day-Tour-to-Tomar-and-Coimbra/d538-349639P8",
    priceFromUSD: 282.64,
    viatorReviewCount: 6,
    reviewCount: 26,
    rating: 5,
    recommendedPct: null,
    priceTiersEUR: { 2: 318, 3: 189, 4: 189, 5: 189, 6: 189, 7: 189, 8: 179 },
    overview: "Discover Portugal’s historic heartlands on this private full‑day tour to Tomar—home to the medieval Templar fortress—and the scholarly city of Coimbra, with its ancient university and rich traditions. With a dedicated driver and guide, enjoy a relaxed pace, insightful stories, and a seamless route through two of Portugal’s most culturally significant cities.",
    included: [
      "All Fees and Taxes",
      "Private transportation",
      "Air-conditioned vehicle",
      "All entrances and tickets",
      "Certified Tour Guide",
      "Bottled water",
      "Local pastry",
      "Lunch",
    ],
    stops: [
      { name: "Tomar", desc: "Tomar is a historic town located in central Portugal, known for its rich cultural heritage and historical significance. At the heart of Tomar stands the Convent of Christ, a UNESCO World Heritage site and former headquarters of the Knights Templar. The convent includes the Templar Castle and the Charola, a unique round church. Tomar's medieval streets, traditional archite …" },
      { name: "Convento de Cristo", desc: "The Convent of Christ in Tomar, Portugal, is a UNESCO World Heritage site and a monumental complex with deep historical significance. Originally built as a Templar stronghold in the 12th century, it later became the headquarters of the Knights Templar in Portugal. The complex includes the iconic Templar Castle and the Charola, a remarkable round church with intr …" },
      { name: "Coimbra", desc: "Coimbra, situated in central Portugal, is a city steeped in history and academic prestige. Home to one of Europe's oldest universities, the University of Coimbra, the city exudes a vibrant student atmosphere. The historic university buildings, including the Joanina Library and the Royal Palace of Alcáçova, showcase impressive architectural and cultural heritage. Nestled on  …" },
      { name: "Universita Di Coimbra", desc: "Coimbra University, perched majestically atop a hill overlooking the Mondego River in central Portugal, is one of the oldest and most prestigious universities in Europe. Founded in 1290, it is a UNESCO World Heritage site with a rich history and architectural splendor. The university's iconic Joanina Library, a Baroque masterpiece, houses an impressive collection of rar …" },
      { name: "Biblioteca Joanina", desc: "The Joanina Library, a jewel within Coimbra University in Portugal, is a captivating blend of architectural beauty and academic history. Built in the Baroque style in the 18th century, the library houses a remarkable collection of rare manuscripts, ancient books, and scholarly treasures. What sets it apart is its unique feature – a colony of bats that help preserve the delicate  …" },
    ],
    topReviews: [
      { title: "Tour to Tomar and Coimbra", author: "Janine_B", date: "Feb 2025", text: "This review is an 4.5. Our guide, NuNu was very kind and knowledgeable. He did everything to make us comfortable on the trip. He gave interesting information about the sites. To make the trip even better, I would have liked time for lunch and also for him to go into the sites with us and explain. We liked touring with NuNu so much we are planning to book another tour with him this trip." },
      { title: "Memorable Coimbra", author: "ARNEL_T", date: "May 2024", text: "Coimbra's old-world charm is very captivating. The city is full of history. Ricardo, our tour guide, did so well in introducing us to many interesting and beautiful places around and we really enjoyed the tour. Thanks Ric!" },
      { title: "Great day with Ricardo and Coimbra and Tomar", author: "Michael_S", date: "May 2024", text: "This tour was a enjoyable tour we covered a lot of territory in just one day traveling from Lisbon to Coimbra and Tomar home of the Templars. Ricardo was knowledgeable, helpful courteous, thorough, and interested in what we wanted to do. Good guide." },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/3b/18/0c.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/78/f0/0b.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/3b/18/03.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/3b/18/04.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/12/3b/18/06.jpg",
    ],
  },
  "fatima-nazare-obidos": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Private-Full-day-Fatima-Nazare-Obidos-Tour-from-Lisbon/d538-349639P5",
    priceFromUSD: 270.82,
    priceTiersEUR: { 1: 359, 2: 229, 3: 229, 4: 179, 5: 179, 6: 179, 7: 179, 8: 159 },
    viatorReviewCount: 9,
    reviewCount: 29,
    rating: 5,
    recommendedPct: null,
    overview: "Maximize your time in Portugal with this private, full-day excursion to Fatima, Nazare, and Obidos from Lisbon—and leave the driving and logistics to someone else. Following hotel pick-up, you’ll be driven to the pilgrimage site of Fatima. Next, you’ll explore the fishing village of Nazare and have lunch, and also visit the beach. Then, explore the medieval town of Obidos and try ginjinha cherry liqueur before returning to Lisbon.",
    included: [
      "All Fees and Taxes",
      "Air-conditioned vehicle",
      "Private transportation",
      "Alcoholic Beverages",
      "Certified tour guide",
      "Private pickup and drop off",
      "Bottled water",
      "Local pastry",
      "Lunch",
    ],
    stops: [
      { name: "Fatima", desc: "\\- Visit the Sanctuary of Our Lady of Fatima, one of the most important pilgrimage sites in the world. \\- Explore the Basilica of Our Lady of the Rosary and the Chapel of the Apparitions. \\- Take some time for personal reflection and perhaps attend a mass or service if you wish." },
      { name: "Nazare", desc: "Lunch (1 hour) \\- Enjoy a traditional Portuguese lunch. Drive for approximately 1.5 hours to reach Nazaré, a charming coastal town known for its stunning beach and big wave surf culture. \\- Visit Nazaré Beach and witness the breathtaking views from the Sitio da Nazaré viewpoint. \\- Explore the town's streets, shops, and restaurants." },
      { name: "Praia da Nazare", desc: "Visit Nazaré beach." },
      { name: "Obidos", desc: "Wander through the picturesque medieval streets, enclosed by the castle walls. \\- Don't miss the chance to try \"ginjinha,\" a traditional Portuguese cherry liqueur, served in chocolate cups." },
      { name: "Castelo de Obidos", desc: "Obidos' castle dates back to Portugal’s Roman occupation, but its current layout is Moorish and the result of restorations and reconstructions from different Portuguese kings, starting in 1148. The main towers were built in 1375, and in addition to its military function, it also served as a royal palace. The main building where the Portuguese king slept when he was in town is  …" },
    ],
    topReviews: [
      { title: "Glorious Day!", author: "Michael_S", date: "Dec 2024", text: "We were very blessed to be able to attend Mass in Fatima. The fish drying on the beach in Nazare was incredible to see. Walking the ancient cobblestone streets in the medieval village surrounded by the castle and its walls were absolutely stunning. The shopping in the town was great. The Christmas decor and children’s rides were fantastic! Our tour guide (Helena) was fabulous! She is family now!" },
      { title: "Breathing tour with a great guide", author: "Luis_O", date: "Sep 2024", text: "A fantastic visit to Fatima, even if you are not catholic its still an impressive place. Being able to see the Basilica and other monuments was great. Moving towards Nazaré we were delighted by the" },
      { title: "Fatima, Nazaré, Obidos with family", author: "Christopher_A", date: "Aug 2024", text: "This was a fabulous tour. Our guide, Rafael, was great. Very attentive to our preferences and needs. I highly recommend this tour!" },
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/11/f9/30/c0.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/11/f9/30/c2.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/2b/0b/d2/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/11/f9/30/bf.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/11/f9/30/c1.jpg",
    ],
  },
  "roman-heritage-alentejo": {
    viatorUrl: "https://www.viator.com/tours/Lisbon/Exclusive-Roman-Wine-Tour-from-Lisbon-Hidden-Alentejo-and-Flavors/d538-349639P17",
    priceFromUSD: 282.64,
    viatorReviewCount: 0,
    reviewCount: 20,
    rating: 5,
    recommendedPct: null,
    overview: "This is a truly unique experience — an all-inclusive private journey from Lisbon into the hidden Alentejo, where a family keeps ancient Roman wine traditions alive.\n\nStep beyond the usual wine tours where wine is still made using methods that date back to Roman times.\n\nExplore cultural stops linked to the Roman roots of the region, including the Roman ruins of São Cucufate in Vila de Frades and the Talha Wine Interpretation Center. These visits set the scene for understanding one of Portugal’s most authentic and little-known wine traditions.\n\nThe afternoon unfolds slowly at a family-run winery, where wine, food and stories are shared in the true rhythm of Alentejo life.\n\nEnjoy a traditional Alentejo lunch, taste local wines, discover ancient clay-vessel winemaking, and experience the warmth of a family business that has kept this tradition alive through generations.\n\nEnjoy a peaceful stop by this hidden river beach surrounded by nature.\n\nPersonalize your tour into the hidden Alentejo.",
    included: [
      "Air-conditioned vehicle",
      "Private pickup and drop-off",
      "Visit to Roman ruins of São Cucufate (Vila de Frades)",
      "Visit to Talha Wine Interpretation Center",
      "Local Guided experience at a family-run winery",
      "Alcoholic Beverages",
      "Lunch",
      "Bottled water",
      "Local guide / host throughout the day",
    ],
    stops: [
      { name: "Villa Romana de Sao Cucufate", desc: "Step into the Roman past at one of the most important archaeological sites in Alentejo. Surrounded by quiet countryside, these ruins offer a glimpse into the Roman presence that helped shape the region's wine culture centuries ago — setting the perfect tone for the experience ahead." },
      { name: "Centro Interpretativo do Vinho de Talha", desc: "Discover one of Portugal’s most unique wine traditions — the art of producing wine in clay vessels. This centuries-old method, dating back to Roman times, is still preserved in Alentejo today, making it one of the most authentic wine experiences in the country." },
      { name: "Vila Alva", desc: "Drive through the charming village of Vila Alva and its surrounding landscapes, where time seems to slow down. Old vineyards, olive trees and traditional whitewashed houses reflect the rural life and deep-rooted traditions of Alentejo." },
      { name: "Adega do Mestre Daniel - XXVI Talhas", desc: "Arrive at a small family-run winery where wine is still made using the ancient Roman clay method. This is not a standard visit, but a personal and immersive experience where guests are welcomed into a living tradition preserved through generations. Enjoy a long, relaxed lunch in a warm family atmosphere, where food, wine and conversation flow naturally. This is where th …" },
      { name: "Albergaria dos Fusos", desc: "During warmer months, enjoy a peaceful stop by this hidden river beach surrounded by nature. A perfect moment to relax and experience the quiet beauty of Alentejo." },
    ],
    topReviews: [
    ],
    gallery: [
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f3/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/f6/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/81/ff/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/82/03/caption.jpg",
      "https://media.tacdn.com/media/attractions-splice-spp-674x446/r/33/24/ad/15/caption.jpg",
    ],
    // Source: supplier.viator.com — TG1, May 6 2026 – no end date.
    // Per-pax EUR by group size: 2→€399, 3-4→€345, 5-6→€320, 7-10→€299. Min 2 pax.
    priceTiersEUR: { 2: 399, 3: 345, 4: 345, 5: 320, 6: 320, 7: 299, 8: 299 },
  },
};

export function getViatorMeta(tourId: string): ViatorMeta | undefined {
  return VIATOR_META[tourId];
}
