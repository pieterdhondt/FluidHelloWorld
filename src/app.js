/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SharedMap } from "fluid-framework";
import { AzureClient, LOCAL_MODE_TENANT_ID } from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "@fluidframework/test-client-utils"

// The config is set to run against a local service by default. Run `npx tinylicious` to run locally
// Update the corresponding properties below with your tenant specific information to run against your tenant.
// const serviceConfig = {
//     connection: {
//         tenantId: LOCAL_MODE_TENANT_ID, // REPLACE WITH YOUR TENANT ID
//         tokenProvider: new InsecureTokenProvider("" /* REPLACE WITH YOUR PRIMARY KEY */, { id: "userId" }),
//         orderer: "http://localhost:7070", // REPLACE WITH YOUR ORDERER ENDPOINT
//         storage: "http://localhost:7070", // REPLACE WITH YOUR STORAGE ENDPOINT
//     }
// };

const userDetails = {
    email: "pieter_dhondt@trimble.com",
    address: "Oslo",
  };
  
const serviceConfig = {
    connection: {
        tenantId: "f303b80c-68a0-42d1-b83f-07a98945c62c", // REPLACE WITH YOUR TENANT ID
        tokenProvider: new InsecureTokenProvider("16ecc1f520a8ff2f19c40be247251f1b" /* REPLACE WITH YOUR PRIMARY KEY */,
            { id: "00172dbb-7a88-4c66-af5c-5bd810fff1ea", name: "Pieter Dhondt", additionalDetails: userDetails }),
        orderer: "https://alfred.westeurope.fluidrelay.azure.com", // REPLACE WITH YOUR ORDERER ENDPOINT
        storage: "https://historian.westeurope.fluidrelay.azure.com", // REPLACE WITH YOUR STORAGE ENDPOINT
    }
};

const client = new AzureClient(serviceConfig);

const diceValueKey = "dice-value-key";


const containerSchema = {
    initialObjects: { diceMap: SharedMap }
};
const root = document.getElementById("content");

const createNewDice = async () => {
    const { container, services } = await client.createContainer(containerSchema);
    
    container.initialObjects.diceMap.set(diceValueKey, 1);
    const id = await container.attach();
    renderDiceRoller(container.initialObjects.diceMap, root);

    const { audience } = services;
    // initAudience(audience);

    return id;
}

const loadExistingDice = async (id) => {
    const { container, services } = await client.getContainer(id, containerSchema);
    
    renderDiceRoller(container.initialObjects.diceMap, root);

    const { audience } = services;
    // initAudience(audience);
}


const audienceDiv = document.createElement("div");

const onAudienceChanged = (audience) => {
  const members = audience.getMembers();
  const self = audience.getMyself();
  const memberStrings = [];
  const useAzure = true; //process.env.FLUID_CLIENT === "azure";

  members.forEach((member) => {
    console.info(member);
    if (member.userId !== (self ? self.userId : "")) {

      if (useAzure) {
        console.info(member);
        // const memberString = `${member.userName}: {Email: ${member.additionalDetails ? member.additionalDetails.email : ""},
        //                 Address: ${member.additionalDetails ? member.additionalDetails.address : ""}}`;
        // memberStrings.push(memberString);
      } else {
        memberStrings.push(member.userName);
      }
    }
  });
  audienceDiv.innerHTML = `
            Current User: ${self ? self.userName : ""} <br />
            Other Users: ${memberStrings.join(", ")}
        `;
};

function initAudience(audience)
{
    onAudienceChanged(audience);
    audience.on("membersChanged", onAudienceChanged);
}


async function start() {
    if (location.hash) {
        await loadExistingDice(location.hash.substring(1))
    } else {
        const id = await createNewDice();
        location.hash = id;
    }
}

start().catch((error) => console.error(error));

// Define the view

const template = document.createElement("template");

template.innerHTML = `
  <style>
    .wrapper { text-align: center }
    .dice { font-size: 200px }
    .roll { font-size: 50px;}
  </style>
  <div class="wrapper">
    <div class="dice"></div>
    <button class="roll"> Roll </button>
  </div>
`

const renderDiceRoller = (diceMap, elem) => {
    elem.appendChild(template.content.cloneNode(true));

    const rollButton = elem.querySelector(".roll");
    const dice = elem.querySelector(".dice");

    // Set the value at our dataKey with a random number between 1 and 6.
    rollButton.onclick = () => diceMap.set(diceValueKey, Math.floor(Math.random() * 6) + 1);

    // Get the current value of the shared data to update the view whenever it changes.
    const updateDice = () => {
        const diceValue = diceMap.get(diceValueKey);
        // Unicode 0x2680-0x2685 are the sides of a dice (⚀⚁⚂⚃⚄⚅)
        dice.textContent = String.fromCodePoint(0x267f + diceValue);
        dice.style.color = `hsl(${diceValue * 60}, 70%, 30%)`;
    };
    updateDice();

    // Use the changed event to trigger the rerender whenever the value changes.
    diceMap.on("valueChanged", updateDice);
}