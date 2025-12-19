# 💈 Barber Shop - Frontend

## 📖 Sobre o Projeto

Este é o repositório do frontend para o projeto **Barber Shop**, uma aplicação web para agendamento de serviços em barbearias. A ideia é facilitar a vida tanto do cliente, que pode agendar um horário de forma rápida, quanto da barbearia, que pode gerenciar sua agenda de forma digital.

Este projeto foi criado com o objetivo de praticar e demonstrar habilidades em desenvolvimento frontend moderno, utilizando tecnologias como React e TypeScript.

## ✨ Funcionalidades

- **Visualização de Serviços:** Lista de todos os serviços oferecidos pela barbearia com seus respectivos preços.
- **Agendamento Online:** O cliente pode escolher o serviço, o profissional e o melhor horário disponível.
- **Design Responsivo:** A aplicação se adapta bem a diferentes tamanhos de tela, como desktops, tablets e celulares.

## 🛠️ Tecnologias Utilizadas

A base do projeto foi construída com as seguintes tecnologias:

- **React**
- **TypeScript**
- **Vite**
- **Styled-Components** (ou outra lib de estilização, como Tailwind CSS)
- **Axios** para as chamadas à API.

## 🚀 Como Rodar o Projeto

Para executar este projeto localmente, siga os passos abaixo:

1. **Clone o repositório**
   ```bash
   git clone https://github.com/RaikySilvaDEV/barbershop-scheduling-frontend
.git
   ```

2. **Acesse a pasta do projeto**
   ```bash
   cd barbershop-scheduling-frontend/frontend
   ```

3. **Instale as dependências**
   ```bash
   npm install
   # ou
   yarn install
   ```

4. **Configure as variáveis de ambiente**
   - Renomeie o arquivo `.env.example` para `.env`.
   - Adicione a URL da sua API backend na variável `VITE_API_URL`.
   ```
   VITE_API_URL=http://localhost:3333
   ```

5. **Inicie o servidor de desenvolvimento**
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

Abra http://localhost:5173 (ou a porta que aparecer no seu terminal) no seu navegador para ver a aplicação rodando.
