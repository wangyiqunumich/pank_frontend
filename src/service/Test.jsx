import axios from 'axios'

export class Test {
    constructor() {}
    async testConnection(testParameter) {
        console.log('test parameter')
        let res = []
        await axios
            //.get('/frontend/frontend_add_nodes?existing=' + existing + "&new=" + newNode)
            .post(process.env.REACT_APP_API_BASE_URL + '/' + process.env.REACT_APP_API_GATEWAY_STAGE_NAME + '/inputToVocab',
                {'testProperty': testParameter},
                { headers:{
                    "Content-Type": 'application/json'
                } })
            .then(function (response) {
                res = response
            })
            .catch(function (error) {
                console.log('error', error)
            })
        return res
    }
}