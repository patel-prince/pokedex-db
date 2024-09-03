import express from "express";
import db from "./db.js";

const router = express.Router();
const BASE_URL = "https://pokeapi.co/api/v2/";

const makeRequest = async (url) => {
  const response = await fetch(BASE_URL + url);
  return response.json();
};

router.get("/pokemons", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT MAX(id) as lastId FROM pokemon");
    const lastId = rows[0].lastId || 0;
    const data = await makeRequest(
      `pokemon-species?limit=10000&offset=${lastId}`
    );
    const pokemons = data.results;
    const values = pokemons.map((pokemon) => {
      const id = pokemon.url.match(/\/(\d+)\/$/)[1];
      return [pokemon.name, id];
    });
    await db.query("INSERT INTO pokemon (name, pokemon_id) VALUES ?", [values]);
    res.status(200).json({ message: "Data fetched and saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data from Pokemon API" });
  }
});

router.get("/pokemon-details", async (req, res) => {
  const [rows] = await db.query("SELECT pokemon_id FROM pokemon");
  for (const row of rows) {
    const data = await makeRequest(`pokemon/${row.pokemon_id}`);
    const details = {
      height: data.height / 10,
      weight: data.weight / 10,
      base_experience: data.base_experience,
      abilities: data.abilities.map(({ ability }) => ability.name).join(","),
      types: data.types.map(({ type }) => type.name).join(","),
      hp: data.stats.find((stat) => stat.stat.name === "hp").base_stat,
      attack: data.stats.find((stat) => stat.stat.name === "attack").base_stat,
      defense: data.stats.find((stat) => stat.stat.name === "defense")
        .base_stat,
      special_attack: data.stats.find(
        (stat) => stat.stat.name === "special-attack"
      ).base_stat,
      special_defense: data.stats.find(
        (stat) => stat.stat.name === "special-defense"
      ).base_stat,
      speed: data.stats.find((stat) => stat.stat.name === "speed").base_stat,
      image: data.sprites.other["official-artwork"].front_default,
      image_gif: data.sprites.other.showdown.front_default,
    };
    await db.query(
      `UPDATE pokemon SET height = ?, weight = ?, base_experience = ?, abilities = ?, types = ?, hp = ?, attack = ?, defense = ?, special_attack = ?, special_defense = ?, speed = ?, image = ?, image_gif = ? WHERE pokemon_id = ?`,
      [
        details.height,
        details.weight,
        details.base_experience,
        details.abilities,
        details.types,
        details.hp,
        details.attack,
        details.defense,
        details.special_attack,
        details.special_defense,
        details.speed,
        details.image,
        details.image_gif,
        row.pokemon_id,
      ]
    );
  }
  res.status(200).json({ message: "Data fetched and saved successfully" });
});

router.get("/pokemon-desc", async (req, res) => {
  const [rows] = await db.query(
    "SELECT pokemon_id FROM pokemon WHERE description IS NULL"
  );
  for (const row of rows) {
    const data = await makeRequest(`pokemon-species/${row.pokemon_id}`);
    const details = {
      description: data.flavor_text_entries.find(
        (item) => item.language.name === "en"
      )?.flavor_text,
    };
    await db.query(`UPDATE pokemon SET description = ? WHERE pokemon_id = ?`, [
      details.description,
      row.pokemon_id,
    ]);
  }
  res.status(200).json({ message: "Data fetched and saved successfully" });
});

export default router;
