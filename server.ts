import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Endpoints
  
  // 1. Create Mercado Pago Payment
  app.post("/api/mercado-pago/create-payment", async (req, res) => {
    try {
      const { fullName, phone, cpf, offerValue, songName, songId } = req.body;
      
      const valueNum = Number(offerValue);
      if (isNaN(valueNum) || valueNum < 1) {
        return res.status(400).json({ error: "O valor de contribuição para o projeto CS do Bem deve ser de pelo menos R$ 1,00 para gerar o Pix." });
      }

      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        // Return Simulated Sandbox response to allow immediate developer testing
        const mockId = `sim_${Date.now()}`;
        
        // Formulates a simulated Pix copy-paste payload mimicking the format
        const mockPixCode = `00020101021226830014br.gov.bcb.pix0119eucarlosrs@gmail.com520400005303986540${valueNum.toFixed(2).length}${valueNum.toFixed(2)}5802BR5925CARLOS ROBERTO SILVA6009SAO PAULO62110507CSMUSIC6304D23A`;
        
        return res.json({
          id: mockId,
          status: "pending",
          qr_code: mockPixCode,
          qr_code_base64: "", // Will fall back to qrserver API on the client side
          isSandbox: true,
          message: "Modo Simulação Ativo (Insira o token do Mercado Pago nas configurações da AI Studio para transações reais)"
        });
      }

      // Format CPF (required by Mercado Pago Pix)
      const cleanCpf = (cpf || "").replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        return res.status(400).json({ error: "CPF inválido. São necessários 11 dígitos para processar via Pix Mercado Pago." });
      }

      const firstName = fullName.split(" ")[0] || "Cliente";
      const lastName = fullName.split(" ").slice(1).join(" ") || "CSMusic";

      // Call Mercado Pago REST API
      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        },
        body: JSON.stringify({
          transaction_amount: valueNum,
          description: `Contribuição CS do Bem - Trilha: ${songName}`,
          payment_method_id: "pix",
          payer: {
            email: `${cleanCpf}@csestudio.com.br`, // standard fallback email structured with CPF
            first_name: firstName,
            last_name: lastName,
            identification: {
              type: "CPF",
              number: cleanCpf
            }
          }
        })
      });

      const data = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error("Mercado Pago API connection failed:", data);
        return res.status(mpResponse.status).json({ 
          error: data.message || "Erro de validação do Mercado Pago. Verifique os dados inseridos (ex: CPF válido).",
          details: data 
        });
      }

      return res.json({
        id: String(data.id),
        status: data.status,
        qr_code: data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        isSandbox: false
      });
    } catch (error: any) {
      console.error("Payment registration route exception:", error);
      return res.status(500).json({ error: error.message || "Erro interno ao processar a criação do Pix." });
    }
  });

  // 2. Query Payment Status
  app.get("/api/mercado-pago/payment-status/:id", async (req, res) => {
    try {
      const { id } = req.params;

      if (id.startsWith("sim_")) {
        // Auto-approve simulated sandbox payments after 10 seconds for seamless user flow
        const createdTimestamp = parseInt(id.replace("sim_", ""), 10);
        const elapsedSeconds = (Date.now() - createdTimestamp) / 1000;
        
        if (elapsedSeconds > 10) {
          return res.json({ status: "approved", isSandbox: true });
        }
        return res.json({ status: "pending", isSandbox: true, elapsedSeconds: Math.round(elapsedSeconds) });
      }

      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        return res.status(400).json({ error: "Mercado Pago Access Token não está configurado." });
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error("Status fetching from Mercado Pago failed:", data);
        return res.status(mpResponse.status).json({ error: "Erro ao obter status da transação." });
      }

      return res.json({ 
        status: data.status, 
        isSandbox: false 
      });
    } catch (error: any) {
      console.error("Exception occurred during status check:", error);
      return res.status(500).json({ error: "Falha interna ao verificar o status." });
    }
  });

  // 3. Image Proxy to bypass CORS issues for canvas rendering
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("Missing image url");
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch image");
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error("Error proxying image:", error);
      res.status(500).send("Error proxying image");
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
