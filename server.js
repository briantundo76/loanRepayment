import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


async function getToken() {
  const response = await axios.post(
    `${process.env.BASE_URL}/api/Auth/RequestToken`,
    {
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }
  );

  return response.data.token;
}

app.get("/", (req, res) => {
  res.send("Backend running...");
});



app.get("/api/token", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get token" });
  }
});

app.post("/api/pay", async (req, res) => {
  try {
    // STEP 1: Get token
    const { amount } = req.body;
    const token = await getToken();

    // STEP 2: Create order
    const orderResponse = await axios.post(
      `${process.env.BASE_URL}/api/Transactions/SubmitOrderRequest`,
      {
        id: "ORDER_" + Date.now(),
        currency: "KES",
        amount: amount, // we will make this dynamic later
        description: "Loan processing fee",
        callback_url: "https://YOUR-NETLIFY-SITE.netlify.app/loan-repayment.html",// we will adjust
        notification_id: "871c64df-f0c9-402c-b905-da7eba1f34da",
        billing_address: {
          email_address: "test@example.com",
          phone_number: "254700000000",
          country_code: "KE",
          first_name: "Test",
          last_name: "User",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("PesaPal Order Response:", orderResponse.data);
res.json(orderResponse.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Payment request failed" });
  }
});

app.get("/api/register-ipn", async (req, res) => {
  try {
    // Get token
    const tokenResponse = await axios.post(
      `${process.env.BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }
    );

    const token = tokenResponse.data.token;

    // Register IPN
    const ipnResponse = await axios.post(
      `${process.env.BASE_URL}/api/URLSetup/RegisterIPN`,
      {
        url: "https://yourdomain.com/ipn", // placeholder
        ipn_notification_type: "GET",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    res.json(ipnResponse.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "IPN registration failed" });
  }
});

app.get("/api/verify", async (req, res) => {
  try {
    const { orderTrackingId } = req.query;

    if (!orderTrackingId) {
      return res.status(400).json({ error: "Missing orderTrackingId" });
    }

    // STEP 1: Get token
    const tokenResponse = await axios.post(
      `${process.env.BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: process.env.PESAPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
      }
    );

    const token = tokenResponse.data.token;

    // STEP 2: Verify transaction
    const statusResponse = await axios.get(
      `${process.env.BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

            const status = statusResponse.data.payment_status_description;

            console.log("RAW STATUS:", status);

            const cleanStatus = status?.trim().toLowerCase();

            console.log("CLEAN STATUS:", cleanStatus);

            if (cleanStatus === "completed") {
            return res.json({ status: "success" });
            } else if (cleanStatus === "failed") {
            return res.json({ status: "failed" });
            } else {
            return res.json({ status: "pending" });
            }

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});