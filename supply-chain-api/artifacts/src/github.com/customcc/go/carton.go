package main

/* Imports
 * 4 utility libraries for formatting, handling bytes, reading and writing JSON, and string manipulation
 * 2 specific Hyperledger Fabric specific libraries for Smart Contracts
 */
import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

//SmartContract  Define the Smart Contract structure
type SmartContract struct {
}

//Data  Define the data structure, with 2 properties.  Structure tags are used by encoding/json library == 03015686 file name to be key
type Data struct {
	JSON     string `json:"jSON"`
	IsUpdate bool   `json:"isUpdate"`
	DocType  string `json:"docType"`
	FileName string `json:"fileName"`
}

//CartonTypes  Define the CartonTypes structure, with 9 properties. Key will be the key of the file + transaction number auto increment.. For example: 20191212-1,20191212-2 etc
type CartonTypes struct {
	CartonNo string `json:"cartonNo"`
	ActualQty string `json:"actualQty"`
	NewQty string `json:"newQty"`
	Reason string `json:"reason"`
	UserId string `json:"userID"`
	PhotoLink string `json:"photoLink"`
	Processed bool `json:"processed"`
	Timestamp string `json:"timestamp"`
	DocType  string `json:"docType"`
	SenderName string `json:"senderName"`
}

/*
 * The Init method is called when the Smart Contract "fabcar" is instantiated by the blockchain network
 * Best practice is to have any Ledger initialization in separate function -- see initLedger()
 */
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

/*
 * The Invoke method is called as a result of an application request to run the Smart Contract "fabcar"
 * The calling application program has also specified the particular smart contract function to be called, with arguments
 */
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()
	// Route to the appropriate handler function to interact with the ledger appropriately
	if function == "queryJSON" {
		return s.queryJSON(APIstub, args)
	} else if function == "createJSON" {
		return s.createJSON(APIstub, args)
	} else if function == "queryAll" {
		return s.queryAll(APIstub)
	} else if function == "updateJSON" {
		return s.updateJSON(APIstub, args)
	} else if function == "createCartons" {  //Newly Added below three functions 
		return s.createCartons(APIstub, args)  
	}else if function == "updateCartons" {
		return s.updateCartons(APIstub, args)
	}else if function == "queryCartons" {
		return s.queryCartons(APIstub, args)
	}else if function == "queryLedger" {
		return s.queryLedger(APIstub, args)
	}else if function == "getHistory" {
		return s.getHistoryforCartons(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) queryJSON(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	jsonAsBytes, _ := APIstub.GetState(args[0])
	return shim.Success(jsonAsBytes)
}

func (s *SmartContract) queryCartons(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	cartonAsBytes, _ := APIstub.GetState(args[0])
	return shim.Success(cartonAsBytes)
}

func (s *SmartContract) createCartons(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 9 {
		return shim.Error("Incorrect number of arguments. Expecting 17")
	}

	var CartonTypes = CartonTypes{CartonNo:args[0],ActualQty:args[1], NewQty: args[2],Reason:args[3], UserId:args[4], PhotoLink: args[5],Processed: false,Timestamp: args[6], DocType: args[7], SenderName: args[8]}

	//args[0] should be with incremented keyvalue and concatenate with sequence number for that file.20191112-1, 20191112-2 etc
	cartonAsBytes, _ := json.Marshal(CartonTypes)
	APIstub.PutState(args[10], cartonAsBytes)
	fmt.Println("new cartonType has been Added")
	APIstub.SetEvent("data_created", cartonAsBytes)
	return shim.Success(nil)
}

func (s *SmartContract) updateCartons(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 6 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}
	
	cartonNo := args[0]

	dataAsBytes, _ := APIstub.GetState(cartonNo)
	carton := CartonTypes{}

	json.Unmarshal(dataAsBytes, &carton)
	carton.NewQty = args[1]
	carton.Reason = args[2]
	carton.UserId = args[3]
	carton.PhotoLink = args[4]
	carton.Processed = true
	carton.Timestamp = args[5]

	dataAsBytes, _ = json.Marshal(carton)
	APIstub.PutState(args[0], dataAsBytes)

	return shim.Success(nil)
}

func (s *SmartContract) queryLedger(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
   queryString := fmt.Sprintf(args[0]) 
   queryResults, err := getQueryResultForQueryString(APIstub, queryString)
	 if err != nil {
	  return shim.Error(err.Error())
   }
   return shim.Success(queryResults)
}

func (s *SmartContract) createJSON(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}
	var data = Data{JSON: args[1], IsUpdate: false, DocType:"Data", FileName:args[0]}

	dataAsBytes, _ := json.Marshal(data)
	APIstub.PutState(args[0], dataAsBytes)
	fmt.Println("new Data has been created")
	APIstub.SetEvent("data_created", dataAsBytes)
	return shim.Success(nil)
}

// updateJSON record as per the request
func (s *SmartContract) updateJSON(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	dataAsBytes, _ := APIstub.GetState(args[0])
	data := Data{}

	json.Unmarshal(dataAsBytes, &data)
	data.JSON = args[1]
	data.IsUpdate = true

	dataAsBytes, _ = json.Marshal(data)
	APIstub.PutState(args[0], dataAsBytes)

	return shim.Success(nil)
}

func (s *SmartContract) queryAll(APIstub shim.ChaincodeStubInterface) sc.Response {
	startKey := ""
	endKey := ""

	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Println("- queryAll:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

// =========================================================================================
// getQueryResultForQueryString executes the passed in query string.
// Result set is built and returned as a byte array containing the JSON results.
// =========================================================================================
func getQueryResultForQueryString(stub shim.ChaincodeStubInterface, queryString string) ([]byte, error) {

	fmt.Printf("- getQueryResultForQueryString queryString:\n%s\n", queryString)

	resultsIterator, err := stub.GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryRecords
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- getQueryResultForQueryString queryResult:\n%s\n", buffer.String())

	return buffer.Bytes(), nil
}

// Get History of a transaction by passing Key
func (s *SmartContract) getHistoryforCartons(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) < 2 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	sttNo := args[1]
	fmt.Printf("##### start History of Record: %s\n", sttNo)

	resultsIterator, err := APIstub.GetHistoryForKey(sttNo)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing historic values for the marble
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		if response.IsDelete {
			buffer.WriteString("null")
		} else {
			buffer.WriteString(string(response.Value))
		}

		buffer.WriteString(", \"Timestamp\":")
		buffer.WriteString("\"")
		buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
		buffer.WriteString("\"")

		buffer.WriteString(", \"IsDelete\":")
		buffer.WriteString("\"")
		buffer.WriteString(strconv.FormatBool(response.IsDelete))
		buffer.WriteString("\"")

		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- gethistoryforCartons returning:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}



// The main function is only relevant in unit test mode. Only included here for completeness.
func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
