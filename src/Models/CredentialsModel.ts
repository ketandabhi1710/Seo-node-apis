const mongoose = require("mongoose");
const credentialSchema = new mongoose.Schema({
  username: String,
  url: String,
  password: String,
});

const CredentialModel = mongoose.model("Credential", credentialSchema);

export default CredentialModel;
