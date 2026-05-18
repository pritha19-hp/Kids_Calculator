const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());

const DATA_FILE = "./data.json";

/* Create file if not exists */
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, []);
}

/* Read Data */
const readData = async () => {
  return await fs.readJson(DATA_FILE);
};

/* Write Data */
const writeData = async (data) => {
  await fs.writeJson(DATA_FILE, data, { spaces: 2 });
};

/* Home Route */
app.get("/", (req, res) => {
  res.json({
    message: "Calculator Backend Running"
  });
});

/* Add Calculation */
app.post("/calculations", async (req, res) => {
  try {
    const { expression, result } = req.body;

    const calculations = await readData();

    const newCalculation = {
      id: uuidv4(),
      expression,
      result,
      createdAt: new Date()
    };

    calculations.push(newCalculation);

    await writeData(calculations);

    res.status(201).json({
      message: "Calculation Saved",
      data: newCalculation
    });

  } catch (error) {
    res.status(500).json({
      message: "Error saving calculation"
    });
  }
});

/* Get All Calculations */
app.get("/calculations", async (req, res) => {
  try {
    const calculations = await readData();

    res.json(calculations);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching calculations"
    });
  }
});

/* Edit Calculation */
app.put("/calculations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { expression, result } = req.body;

    const calculations = await readData();

    const updatedCalculations = calculations.map(item => {
      if (item.id === id) {
        return {
          ...item,
          expression,
          result,
          updatedAt: new Date()
        };
      }
      return item;
    });

    await writeData(updatedCalculations);

    res.json({
      message: "Calculation Updated"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating calculation"
    });
  }
});

/* Delete Calculation */
app.delete("/calculations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const calculations = await readData();

    const filteredData = calculations.filter(
      item => item.id !== id
    );

    await writeData(filteredData);

    res.json({
      message: "Calculation Deleted"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting calculation"
    });
  }
});

/* Clear All History */
app.delete("/calculations", async (req, res) => {
  try {
    await writeData([]);

    res.json({
      message: "All Calculations Cleared"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error clearing calculations"
    });
  }
});

/* Start Server */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
